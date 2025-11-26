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

async function sendEmail(from: string, to: string, subject: string, text: string, html?: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }

  return retryWithBackoff(async () => {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        text,
        html: html || text.replace(/\n/g, '<br>')
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(`Resend API error: ${result.message || 'Unknown error'}`);
    }
    return result;
  });
}

// Extract plain text from HTML email
function extractTextFromHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const emailData = await req.json();
    const { from, to, subject, body, html, recipientEmail, attachments } = emailData;

    console.log('📧 Email webhook received:', { 
      from, 
      to, 
      subject, 
      recipientEmail,
      hasAttachments: !!attachments?.length 
    });

    // Extract text content
    let emailContent = body || '';
    if (!emailContent && html) {
      emailContent = extractTextFromHtml(html);
    }

    // Add attachment info to content
    if (attachments && attachments.length > 0) {
      const attachmentInfo = attachments.map((a: any) => 
        `[Attachment: ${a.filename || 'file'}]`
      ).join('\n');
      emailContent = `${emailContent}\n\n${attachmentInfo}`;
    }

    // Find agent by email configuration
    const { data: agents, error: agentError } = await supabaseClient
      .from('agents')
      .select('*')
      .eq('is_active', true);

    if (agentError) throw agentError;

    const agent = agents?.find(a => 
      a.settings?.connections?.email?.enabled && 
      a.settings?.connections?.email?.smtpUsername === recipientEmail
    );

    if (!agent) {
      console.log('⚠️ No agent found with Email enabled for:', recipientEmail);
      return new Response('No agent configured', { status: 404, headers: corsHeaders });
    }

    console.log('🤖 Processing email for agent:', agent.name);

    // Create or find conversation (use email thread)
    const conversationId = `email_${from}_${subject.replace(/[^a-zA-Z0-9]/g, '_')}`;
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
        title: `Email: ${subject.slice(0, 50)}`
      });
    }

    // Store incoming email as user message
    const messageContent = `Subject: ${subject}\n\n${emailContent}`;
    await supabaseClient.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: messageContent
    });

    // Get conversation history (last 20 messages for email context)
    const { data: messages } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(20);

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
      
      // Send error email
      const smtpConfig = agent.settings.connections.email;
      await sendEmail(
        smtpConfig.smtpUsername,
        from,
        `Re: ${subject}`,
        '⚠️ Sorry, I encountered an error processing your email. Please try again or contact support.'
      );
      throw chatError;
    }

    console.log('✅ Email chat response:', JSON.stringify(chatResponse, null, 2));

    const aiResponse = chatResponse?.response || "I'm here to help! How can I assist you?";

    // Send response email with retry
    const smtpConfig = agent.settings.connections.email;
    const emailResult = await sendEmail(
      smtpConfig.smtpUsername,
      from,
      `Re: ${subject}`,
      aiResponse
    );

    const responseTime = Date.now() - startTime;
    console.log(`✅ Email response sent successfully in ${responseTime}ms`, emailResult);

    return new Response(JSON.stringify({ 
      success: true, 
      responseTime,
      emailId: emailResult.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('❌ Email webhook error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
