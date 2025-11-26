import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessApiKey, phoneNumberId } = await req.json();

    if (!businessApiKey || !phoneNumberId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Business API Key and Phone Number ID are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`;
    console.log('Webhook URL:', webhookUrl);

    // Register webhook with WhatsApp
    const subscribeResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/subscribed_apps`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${businessApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const subscribeResult = await subscribeResponse.json();
    console.log('WhatsApp subscription result:', subscribeResult);

    if (!subscribeResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: subscribeResult.error?.message || 'Failed to subscribe to webhooks'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get phone number info
    const phoneInfoResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}?fields=display_phone_number,verified_name`,
      {
        headers: {
          'Authorization': `Bearer ${businessApiKey}`
        }
      }
    );

    const phoneInfo = await phoneInfoResponse.json();
    console.log('WhatsApp phone info:', phoneInfo);

    return new Response(
      JSON.stringify({
        success: true,
        phoneInfo,
        webhookUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('WhatsApp webhook registration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
