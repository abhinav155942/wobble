import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    console.log(`Retrying after ${delay}ms... (${retries} retries left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

async function replyToComment(apiKey: string, commentId: string, text: string) {
  return retryWithBackoff(async () => {
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/comments?part=snippet',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          snippet: {
            parentId: commentId,
            textOriginal: text
          }
        })
      }
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(`YouTube API error: ${result.error?.message || 'Unknown error'}`);
    }
    return result;
  });
}

async function getCommentDetails(apiKey: string, commentId: string) {
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/comments?part=snippet&id=${commentId}&key=${apiKey}`
  );
  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle YouTube webhook verification (PubSubHubbub)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const challenge = url.searchParams.get('hub.challenge');
    const mode = url.searchParams.get('hub.mode');
    const topic = url.searchParams.get('hub.topic');

    if (mode === 'subscribe' && challenge) {
      console.log('✅ YouTube webhook verified for topic:', topic);
      return new Response(challenge, { status: 200 });
    }
    return new Response('Bad Request', { status: 400 });
  }

  const startTime = Date.now();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const contentType = req.headers.get('content-type') || '';
    let notification: any;

    // YouTube sends XML for PubSubHubbub notifications
    if (contentType.includes('application/atom+xml') || contentType.includes('application/xml')) {
      const xmlText = await req.text();
      console.log('📹 YouTube webhook XML received:', xmlText);

      // Basic XML parsing for comment notifications
      const videoIdMatch = xmlText.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const channelIdMatch = xmlText.match(/<yt:channelId>([^<]+)<\/yt:channelId>/);
      
      notification = {
        videoId: videoIdMatch?.[1],
        channelId: channelIdMatch?.[1],
        type: 'video_update'
      };
    } else {
      // Handle JSON notifications (custom webhook setup)
      notification = await req.json();
      console.log('📹 YouTube webhook received:', JSON.stringify(notification, null, 2));
    }

    // Extract comment data
    const { commentId, videoId, authorName, commentText, type } = notification;

    if (type !== 'comment' && !commentText) {
      console.log('⚠️ Not a comment notification, skipping');
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`💬 YouTube comment from ${authorName}: ${commentText}`);

    // Find agent with YouTube enabled
    const { data: agents, error: agentError } = await supabaseClient
      .from('agents')
      .select('*')
      .eq('is_active', true);

    if (agentError) throw agentError;

    const agent = agents?.find(a => 
      a.settings?.connections?.youtube?.enabled && 
      a.settings?.connections?.youtube?.apiKey
    );

    if (!agent) {
      console.log('⚠️ No agent found with YouTube enabled');
      return new Response('No agent configured', { status: 404, headers: corsHeaders });
    }

    console.log('🤖 Processing comment for agent:', agent.name);

    // Check if auto-reply is enabled for comments
    const youtubeSettings = agent.settings.connections.youtube;
    const useCases = youtubeSettings.useCases || {};
    
    if (!useCases.commentModeration && !useCases.autoReply) {
      console.log('⚠️ Auto-reply not enabled for this agent');
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create or find conversation for this video
    const conversationId = `youtube_${videoId}_${commentId}`;
    const { data: existingConv } = await supabaseClient
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .single();

    if (!existingConv) {
      await supabaseClient.from('conversations').insert({
        id: conversationId,
        agent_id: agent.id,
        user_id: agent.user_id,
        title: `YouTube: ${authorName} on video ${videoId}`
      });
    }

    // Store comment as user message
    await supabaseClient.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: `Comment by ${authorName}: ${commentText}`
    });

    // Get conversation history
    const { data: messages } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    const chatMessages = (messages || []).reverse().map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Get AI response with retry
    const { data: chatResponse, error: chatError } = await retryWithBackoff(
      () => supabaseClient.functions.invoke('chat', {
        body: {
          messages: chatMessages,
          agentId: agent.id,
          conversationId,
          streamResponse: false,
        },
      })
    );

    if (chatError) {
      console.error('❌ Chat function error:', chatError);
      throw chatError;
    }

    console.log('✅ YouTube chat response:', JSON.stringify(chatResponse, null, 2));

    const aiResponse = chatResponse?.response || "Thanks for your comment!";

    // Reply to comment with retry (YouTube limit: 10000 chars)
    const apiKey = youtubeSettings.apiKey;
    const maxLength = 10000;
    const replyText = aiResponse.length > maxLength 
      ? aiResponse.slice(0, maxLength - 3) + '...' 
      : aiResponse;

    await replyToComment(apiKey, commentId, replyText);

    const responseTime = Date.now() - startTime;
    console.log(`✅ YouTube reply posted successfully in ${responseTime}ms`);

    return new Response(JSON.stringify({ 
      success: true, 
      responseTime,
      commentId,
      videoId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('❌ YouTube webhook error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
