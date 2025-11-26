import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { botToken, agentId } = await req.json();

    if (!botToken) {
      return new Response(
        JSON.stringify({ error: "Bot token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Registering webhook for bot token:", botToken.substring(0, 10) + "...");

    // Set webhook URL
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-webhook`;
    console.log("Webhook URL:", webhookUrl);

    // First, test the bot token by calling getMe
    const getMeResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`,
      { method: "POST" }
    );
    const getMeResult = await getMeResponse.json();

    if (!getMeResult.ok) {
      console.error("Bot token validation failed:", getMeResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid bot token",
          details: getMeResult.description 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Bot validated:", getMeResult.result);

    // Register webhook
    const setWebhookResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message"],
        }),
      }
    );

    const webhookResult = await setWebhookResponse.json();
    console.log("Webhook registration result:", webhookResult);

    if (!webhookResult.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to register webhook",
          details: webhookResult.description 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get webhook info to verify
    const getWebhookResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`,
      { method: "POST" }
    );
    const webhookInfo = await getWebhookResponse.json();
    console.log("Webhook info:", webhookInfo);

    // Send test message to verify everything works
    const testSuccess = webhookInfo.ok && webhookInfo.result.url === webhookUrl;

    return new Response(
      JSON.stringify({
        success: true,
        botInfo: getMeResult.result,
        webhookInfo: webhookInfo.result,
        testSuccess,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error registering webhook:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
