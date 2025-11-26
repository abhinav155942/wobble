import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

// Retry with exponential backoff
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

// Send Telegram message with retry
async function sendTelegramMessage(botToken: string, chatId: number, text: string, options: any = {}) {
  return retryWithBackoff(async () => {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, 4096), // Telegram message limit
        parse_mode: "Markdown",
        ...options,
      }),
    });

    const result = await response.json();
    if (!result.ok) {
      throw new Error(`Telegram API error: ${result.description}`);
    }
    return result;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const update = await req.json();
    console.log("📱 Telegram webhook received:", JSON.stringify(update, null, 2));

    // Handle both text messages and media
    const message = update.message;
    if (!message) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatId = message.chat.id;
    const from = message.from;
    
    // Extract message content (text, caption, or media description)
    let messageContent = "";
    let messageType = "text";
    
    if (message.text) {
      messageContent = message.text;
      messageType = "text";
    } else if (message.photo) {
      messageContent = message.caption || "[Photo received]";
      messageType = "photo";
    } else if (message.video) {
      messageContent = message.caption || "[Video received]";
      messageType = "video";
    } else if (message.document) {
      messageContent = message.caption || `[Document: ${message.document.file_name || "file"}]`;
      messageType = "document";
    } else if (message.voice) {
      messageContent = "[Voice message received]";
      messageType = "voice";
    } else if (message.sticker) {
      messageContent = `[Sticker: ${message.sticker.emoji || ""}]`;
      messageType = "sticker";
    } else {
      console.log("⚠️ Unsupported message type, skipping");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`💬 Message from ${from.first_name} (${chatId}): ${messageContent} [${messageType}]`);

    // Find agent with Telegram enabled
    const { data: agents, error: agentsError } = await supabaseClient
      .from("agents")
      .select("*")
      .eq("is_active", true);

    if (agentsError) {
      console.error("❌ Error fetching agents:", agentsError);
      throw agentsError;
    }

    let targetAgent = null;
    for (const agent of agents || []) {
      const connections = (agent.settings as any)?.connections || {};
      if (connections.telegram?.enabled && connections.telegram?.botToken) {
        targetAgent = agent;
        break;
      }
    }

    if (!targetAgent) {
      console.log("⚠️ No agent found with Telegram enabled");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const botToken = (targetAgent.settings as any).connections.telegram.botToken;

    // Get or create conversation
    const conversationId = `telegram_${chatId}`;
    const { data: existingConv } = await supabaseClient
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .single();

    if (!existingConv) {
      await supabaseClient.from("conversations").insert({
        id: conversationId,
        agent_id: targetAgent.id,
        user_id: targetAgent.user_id,
        title: `Telegram: ${from.first_name} ${from.last_name || ""}`.trim(),
      });
    }

    // Save user message with metadata
    await supabaseClient.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: messageContent,
    });

    // Get conversation history (last 50 messages for context)
    const { data: messages } = await supabaseClient
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(50);

    // Reverse to get chronological order
    const chatMessages = (messages || []).reverse().map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    console.log("🤖 Calling chat function...");

    // Call chat function with retry
    const { data: chatResponse, error: chatError } = await retryWithBackoff(
      () => supabaseClient.functions.invoke("chat", {
        body: {
          messages: chatMessages,
          agentId: targetAgent.id,
          conversationId: conversationId,
          streamResponse: false,
        },
      })
    );

    if (chatError) {
      console.error("❌ Error calling chat function:", chatError);
      await sendTelegramMessage(
        botToken,
        chatId,
        "⚠️ Sorry, I encountered an error processing your message. Please try again."
      );
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Chat response received:", JSON.stringify(chatResponse, null, 2));

    // Extract AI response
    const aiResponse = chatResponse?.response || "I'm here to help! How can I assist you?";

    // Send response with retry and split long messages
    const maxLength = 4096;
    if (aiResponse.length <= maxLength) {
      await sendTelegramMessage(botToken, chatId, aiResponse);
    } else {
      // Split long messages
      const parts = aiResponse.match(new RegExp(`.{1,${maxLength}}`, "g")) || [];
      for (const part of parts) {
        await sendTelegramMessage(botToken, chatId, part);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between parts
      }
    }

    const responseTime = Date.now() - startTime;
    console.log(`✅ Telegram response sent successfully in ${responseTime}ms`);

    return new Response(JSON.stringify({ 
      ok: true, 
      responseTime,
      messageType,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error("❌ Telegram webhook error:", error);
    
    return new Response(JSON.stringify({ 
      ok: true, 
      error: error instanceof Error ? error.message : "Unknown error",
      responseTime,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
