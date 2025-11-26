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

async function sendInstagramMessage(accessToken: string, recipientId: string, message: any) {
  return retryWithBackoff(async () => {
    const response = await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(`Instagram API error: ${result.error.message}`);
    }
    return result;
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle verification challenge
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === 'instagram_verify_token') {
      console.log('✅ Instagram webhook verified');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  const startTime = Date.now();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const webhook = await req.json();
    console.log('📱 Instagram webhook received:', JSON.stringify(webhook, null, 2));

    const entry = webhook.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (!messaging) {
      console.log('⚠️ No messaging in webhook');
      return new Response('No messaging', { status: 200, headers: corsHeaders });
    }

    const senderId = messaging.sender?.id;
    
    // Extract message content based on type
    let messageContent = "";
    let messageType = "text";
    
    if (messaging.message?.text) {
      messageContent = messaging.message.text;
      messageType = "text";
    } else if (messaging.message?.attachments) {
      const attachment = messaging.message.attachments[0];
      messageType = attachment.type;
      
      switch (attachment.type) {
        case "image":
          messageContent = "[Image received]";
          break;
        case "video":
          messageContent = "[Video received]";
          break;
        case "audio":
          messageContent = "[Audio received]";
          break;
        case "file":
          messageContent = "[File received]";
          break;
        default:
          messageContent = `[${attachment.type} received]`;
      }
    } else if (messaging.postback) {
      messageContent = `[Postback: ${messaging.postback.title || messaging.postback.payload}]`;
      messageType = "postback";
    } else {
      console.log('⚠️ Unsupported message type');
      return new Response('Unsupported type', { status: 200, headers: corsHeaders });
    }

    console.log(`💬 Instagram message from ${senderId}: ${messageContent} [${messageType}]`);

    // Find agent by Instagram API key
    const { data: agents, error: agentError } = await supabaseClient
      .from('agents')
      .select('*')
      .eq('is_active', true);

    if (agentError) throw agentError;

    const agent = agents?.find(a => 
      a.settings?.connections?.instagram?.enabled && 
      a.settings?.connections?.instagram?.apiKey
    );

    if (!agent) {
      console.log('⚠️ No agent found with Instagram enabled');
      return new Response('No agent configured', { status: 404, headers: corsHeaders });
    }

    console.log('🤖 Processing message for agent:', agent.name);

    // Create or find conversation
    const conversationId = `instagram_${senderId}`;
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
        title: `Instagram: ${senderId}`
      });
    }

    // Store incoming message
    await supabaseClient.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: messageContent
    });

    // Get conversation history (last 50 messages)
    const { data: messages } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(50);

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
      const accessToken = agent.settings.connections.instagram.apiKey;
      await sendInstagramMessage(accessToken, senderId, {
        recipient: { id: senderId },
        message: { text: '⚠️ Sorry, I encountered an error. Please try again.' }
      });
      throw chatError;
    }

    console.log('✅ Instagram chat response:', JSON.stringify(chatResponse, null, 2));

    const aiResponse = chatResponse?.response || "I'm here to help! How can I assist you?";

    // Send response with retry (Instagram limit: 2000 chars)
    const accessToken = agent.settings.connections.instagram.apiKey;
    const maxLength = 2000;

    if (aiResponse.length <= maxLength) {
      await sendInstagramMessage(accessToken, senderId, {
        recipient: { id: senderId },
        message: { text: aiResponse }
      });
    } else {
      // Split long messages
      const parts = aiResponse.match(new RegExp(`.{1,${maxLength}}`, "g")) || [];
      for (const part of parts) {
        await sendInstagramMessage(accessToken, senderId, {
          recipient: { id: senderId },
          message: { text: part }
        });
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    const responseTime = Date.now() - startTime;
    console.log(`✅ Instagram response sent successfully in ${responseTime}ms`);

    return new Response(JSON.stringify({ 
      success: true, 
      responseTime,
      messageType 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('❌ Instagram webhook error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
