import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { smtpHost, smtpPort, smtpUsername, smtpPassword } = await req.json();

    if (!smtpHost || !smtpPort || !smtpUsername || !smtpPassword) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'All SMTP configuration fields are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Testing SMTP connection:', { smtpHost, smtpPort, smtpUsername });

    // Create SMTP client
    const client = new SmtpClient();

    // Connect to SMTP server
    await client.connectTLS({
      hostname: smtpHost,
      port: parseInt(smtpPort),
      username: smtpUsername,
      password: smtpPassword,
    });

    // Send test email
    await client.send({
      from: smtpUsername,
      to: smtpUsername, // Send to self for testing
      subject: "AI Support Desk - SMTP Test",
      content: "This is a test email from AI Support Desk. Your SMTP configuration is working correctly!",
    });

    await client.close();

    console.log('SMTP test successful');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Test email sent successfully to ${smtpUsername}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('SMTP test error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown SMTP error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
