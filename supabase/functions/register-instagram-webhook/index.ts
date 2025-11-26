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
    const { apiKey } = await req.json();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Instagram Graph API Key is required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram-webhook`;
    console.log('Webhook URL:', webhookUrl);

    // Verify the access token
    const verifyResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?access_token=${apiKey}`
    );

    const verifyResult = await verifyResponse.json();
    console.log('Instagram token verification:', verifyResult);

    if (!verifyResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: verifyResult.error?.message || 'Invalid access token'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Instagram account info
    const accountResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${apiKey}`
    );

    const accountInfo = await accountResponse.json();
    console.log('Instagram account info:', accountInfo);

    return new Response(
      JSON.stringify({
        success: true,
        accountInfo: verifyResult,
        webhookUrl,
        note: 'Please configure webhook in Facebook Developer Console with this URL and subscribe to messages'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Instagram webhook registration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
