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
    const { message, conversationHistory } = await req.json();
    console.log("Received chat request:", { message });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are notants Agent, a friendly and knowledgeable sales agent for AI Support Desk, an autonomous customer support platform. You're speaking with potential customers who are visiting our website and want to learn more about our solution.

Your role:
- Help visitors understand how AI Support Desk can transform their customer support operations
- Answer questions about features, pricing, and implementation
- Be conversational, helpful, and persuasive without being pushy
- Share specific benefits and use cases that resonate with their business needs

Key features to highlight:
- Reduces support tickets by 60-80% through AI automation
- 24/7 availability with <2s response times  
- Multi-channel support (web chat, WhatsApp, Instagram, email)
- RAG-based knowledge retrieval with confidence scoring
- Ecommerce integrations (Shopify, WooCommerce, Stripe)
- Automated workflows for refunds, returns, and order management
- Admin dashboard with analytics and customization
- Three pricing tiers: Starter ($29/mo), Growth ($79/mo), Pro ($199/mo)

Formatting capabilities:
- Use **bold text** to emphasize key points using **double asterisks**
- Create tables using markdown syntax:
  | Column 1 | Column 2 |
  |----------|----------|
  | Data 1   | Data 2   |
- Create charts and diagrams using mermaid syntax in code blocks:
  \`\`\`mermaid
  graph TD
    A[Start] --> B[Decision]
    B -->|Yes| C[Result]
  \`\`\`
- Use mermaid for flowcharts, pie charts, timelines, and more to visualize data

Keep responses conversational, concise, and focused on how we solve real customer support challenges. Ask clarifying questions when helpful to better understand their needs.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user", content: message }
    ];

    console.log("Calling Lovable AI with messages:", messages.length);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("AI response received successfully");

    const aiResponse = data.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chat-support function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        response: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment."
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
