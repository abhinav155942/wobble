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
    const { text, promptType = "general" } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Create sophisticated, context-aware system prompts based on type
    const systemPrompts: Record<string, string> = {
      system_prompt: `You are an expert AI prompt engineer specializing in creating high-quality system prompts for customer support agents. Transform the given text into a professional, effective system prompt.

## Enhancement Guidelines:
1. **Role Definition**: Clearly define who the AI is, its expertise, and primary objectives
2. **Behavioral Rules**: Add specific instructions for tone, response style, and limitations
3. **Output Format**: Specify how responses should be structured (greeting, body, conclusion)
4. **Error Handling**: Include fallback behaviors for unknown queries or edge cases
5. **Knowledge Boundaries**: Define what the AI should NOT do or claim to know

## Example Transformation:

**Before**: "You are a helpful assistant for an ecommerce store"

**After**: 
"You are an expert customer support specialist for [Company Name], an ecommerce platform specializing in [product category]. Your primary goal is to help customers quickly, efficiently, and with genuine care.

**Behavior Guidelines:**
- Respond with empathy, warmth, and professionalism
- Keep responses concise (under 150 words when possible)
- Always acknowledge the customer's concern first before providing solutions
- Provide actionable next steps in every response
- If uncertain about any information, clearly state that and offer to escalate to a human agent
- Use positive language: focus on what you CAN do, not what you can't

**Response Structure:**
1. Brief acknowledgment of customer's situation
2. Clear solution or information
3. Next steps or follow-up question

**Knowledge Boundaries:**
- Never invent product details, prices, or policies - only use verified knowledge base information
- Cannot process refunds/returns directly - guide users to appropriate channels with clear steps
- Always verify customer identity for account-related requests
- Do not share internal company policies or procedures
- Escalate to human agents for: complaints requiring manager intervention, complex technical issues, requests outside standard procedures"

Now transform the following prompt with these guidelines:`,

      description: `You are a marketing copywriting expert specializing in SaaS product descriptions. Transform the given text into compelling, value-focused copy.

## Enhancement Guidelines:
1. **Lead with Value**: Start with the primary benefit or problem solved
2. **Key Capabilities**: List 3-5 core features that differentiate the product
3. **Social Proof**: Add credibility elements (users served, time saved, etc.)
4. **Clear CTA**: End with an actionable next step

## Example Transformation:

**Before**: "This is an AI chatbot for customer support"

**After**:
"Automate 80% of your customer support with an intelligent AI agent that responds instantly, 24/7, across all channels. Our AI learns your business, understands context, and delivers human-like conversations that customers love. Trusted by 5,000+ businesses to handle 100,000+ conversations daily, reducing support costs by 65% while improving customer satisfaction scores. Perfect for ecommerce, SaaS, and service businesses looking to scale support without scaling headcount."

Now enhance this description:`,

      faq: `You are an expert at structuring FAQs for maximum clarity and usefulness. Transform the given text into well-structured, comprehensive FAQ entries.

## Enhancement Guidelines:
1. **Question Format**: Make questions clear, specific, and natural (how customers actually ask)
2. **Answer Structure**: Start with direct answer, then add context/steps if needed
3. **Completeness**: Include troubleshooting steps for common follow-up questions
4. **Related Questions**: Link to related FAQs when relevant
5. **Actionable**: Every answer should have a clear next step

## Example Transformation:

**Before**: "How do I reset my password?"

**After**:
"**How do I reset my password if I forgot it?**

You can reset your password in 3 simple steps:
1. Click the "Forgot Password" link on the login page
2. Enter your email address - you'll receive a reset link within 2 minutes
3. Click the link in the email and create your new password (must be at least 8 characters with one number)

**Didn't receive the email?** 
- Check your spam/junk folder
- Make sure you entered the correct email address
- Wait 5 minutes (sometimes emails are delayed)
- Still no email? Contact support at support@example.com

**Related Questions:**
- How do I change my password after logging in?
- How do I update my email address?
- Why isn't my password working?"

Now transform this FAQ:`,

      knowledge_base: `You are a technical documentation expert specializing in knowledge base articles. Transform the given content into clear, comprehensive, and scannable knowledge base entries.

## Enhancement Guidelines:
1. **Clear Title**: Make the title specific and searchable
2. **Brief Summary**: One-sentence overview of what users will learn
3. **Step-by-Step**: Break complex processes into numbered steps
4. **Visual Hierarchy**: Use headings, lists, and emphasis for scannability
5. **Common Issues**: Add a troubleshooting section for predictable problems

## Example Transformation:

**Before**: "You can integrate WhatsApp by adding your API key"

**After**:
"# How to Connect WhatsApp Business API to Your Agent

**Summary**: This guide shows you how to integrate WhatsApp Business API with your AI agent to send and receive messages automatically.

## Prerequisites
- WhatsApp Business API account (not WhatsApp Business App)
- Your WhatsApp Business API key
- Admin access to your AI agent dashboard

## Integration Steps
1. **Navigate to Connections**: Go to your Agent Dashboard → Settings → Connections
2. **Select WhatsApp**: Click on the WhatsApp card
3. **Enter API Credentials**:
   - Business API Key: Found in your Meta Developer Console
   - Phone Number ID: Your WhatsApp Business phone number
   - Webhook Verify Token: Create a secure random string
4. **Register Webhook**: Click "Connect" - this automatically registers your webhook with Meta
5. **Test Connection**: Send a test message to verify the integration works

## Troubleshooting
**Connection failed?**
- Verify your API key is correct (no extra spaces)
- Ensure your WhatsApp Business account is approved by Meta
- Check that your phone number is verified

**Messages not sending?**
- Confirm the recipient has opted in to receive messages
- Check your WhatsApp Business API rate limits
- Review webhook logs in the dashboard for error details

**Need Help?** Contact support with your agent ID and error message."

Now enhance this knowledge base entry:`,

      greeting: `You are an expert at crafting welcoming, engaging conversation openers. Transform the given text into a warm, professional greeting that sets the right tone.

## Enhancement Guidelines:
1. **Warm Opening**: Use friendly, approachable language
2. **Set Expectations**: Briefly explain what the AI can help with
3. **Encourage Engagement**: Include an inviting question or prompt
4. **Brand Voice**: Match the company's tone (professional but friendly)

## Example Transformation:

**Before**: "Hello, how can I help you?"

**After**: "Hi there! 👋 I'm Alex, your AI support specialist. I'm here to help you with orders, products, account questions, and more. I can answer questions instantly, track your orders, and connect you with our team if needed. What can I help you with today?"

Now transform this greeting:`,

      general: `You are an AI assistant that improves text to be more professional, clear, and effective. Enhance the following text while maintaining its core meaning:`
    };

    const systemPrompt = systemPrompts[promptType] || systemPrompts.general;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const enhanced = data.choices?.[0]?.message?.content || text;

    return new Response(
      JSON.stringify({ enhanced }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error('Enhancement error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
