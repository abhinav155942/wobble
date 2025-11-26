import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, agentId, conversationId, streamResponse = true, selectedModel = "wopple-free" } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Helper function to create execution traces
    const createTrace = async (
      stepNumber: number,
      stepType: string,
      stepName: string,
      status: string,
      inputData?: any | null,
      outputData?: any | null,
      errorMessage?: string | null,
      stepDescription?: string | null
    ) => {
      if (!conversationId) {
        console.error('Cannot create trace: conversationId is missing');
        return;
      }
      
      try {
        const traceData: any = {
          conversation_id: conversationId,
          step_number: stepNumber,
          step_type: stepType,
          step_name: stepName,
          status: status,
          step_description: stepDescription || undefined
        };

        if (inputData) traceData.input_data = inputData;
        if (outputData) traceData.output_data = outputData;
        if (errorMessage) traceData.error_message = errorMessage;
        
        if (status === 'running') {
          traceData.started_at = new Date().toISOString();
        } else if (status === 'completed' || status === 'error') {
          traceData.completed_at = new Date().toISOString();
        }

        console.log('Creating trace:', { stepNumber, stepType, stepName, status });
        const { error } = await supabase.from('execution_traces').insert(traceData);
        
        if (error) {
          console.error('Failed to create trace:', error);
        } else {
          console.log('Trace created successfully:', stepName);
        }
      } catch (error) {
        console.error('Exception creating trace:', error);
      }
    };

    // Get agent configuration including connections
    const { data: agent } = await supabase
      .from('agents')
      .select('system_prompt, settings, user_id')
      .eq('id', agentId)
      .single();
    
    const connections = agent?.settings?.connections || {};
    const userId = agent?.user_id;
    const aiSettings = agent?.settings?.ai || {};
    
    // Determine AI provider and model based on selectedModel
    let aiProvider = "lovable"; // default
    let aiModel = "google/gemini-2.5-flash";
    let aiApiKey = LOVABLE_API_KEY;
    let aiBaseUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
    
    if (selectedModel !== "wopple-free") {
      // Parse custom model selection (format: "provider-model")
      const [provider, ...modelParts] = selectedModel.split('-');
      const model = modelParts.join('-');
      
      if (provider === "openai" && aiSettings.customProvider === "openai") {
        aiProvider = "openai";
        aiModel = model;
        aiApiKey = aiSettings.customApiKey || LOVABLE_API_KEY;
        aiBaseUrl = "https://api.openai.com/v1/chat/completions";
      } else if (provider === "anthropic" && aiSettings.customProvider === "anthropic") {
        aiProvider = "anthropic";
        aiModel = model;
        aiApiKey = aiSettings.customApiKey || LOVABLE_API_KEY;
        aiBaseUrl = "https://api.anthropic.com/v1/messages";
      } else if (provider === "google" && aiSettings.customProvider === "google") {
        aiProvider = "google";
        aiModel = model;
        aiApiKey = aiSettings.customApiKey || LOVABLE_API_KEY;
        aiBaseUrl = "https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent";
      }
    }
    
    console.log(`Using AI Provider: ${aiProvider}, Model: ${aiModel}`);

    // Get user message for memory search
    const lastUserMessage = messages[messages.length - 1];
    let relevantMemories: any[] = [];
    
    // Retrieve relevant memories using semantic search
    if (lastUserMessage && lastUserMessage.role === 'user') {
      try {
        console.log('Generating embedding for user query...');
        const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: lastUserMessage.content,
          }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          const queryEmbedding = embeddingData.data[0].embedding;

          console.log('Searching for relevant memories...');
          const { data: memories } = await supabase.rpc('search_agent_memories', {
            p_agent_id: agentId,
            p_query_embedding: queryEmbedding,
            p_match_threshold: 0.7,
            p_match_count: 3
          });

          if (memories && memories.length > 0) {
            relevantMemories = memories;
            console.log(`Found ${memories.length} relevant memories`);
          }
        }
      } catch (memError) {
        console.error('Error retrieving memories:', memError);
      }
    }

    // Get knowledge base context
    const { data: knowledgeBase } = await supabase
      .from('knowledge_base')
      .select('title, content')
      .eq('agent_id', agentId)
      .limit(5);

    let systemPrompt = agent?.system_prompt || "You are a helpful and friendly AI assistant. You communicate in a warm, conversational tone while being professional and knowledgeable. You aim to understand the user's needs and provide clear, helpful responses.";
    
    // Add relevant memories to system prompt
    if (relevantMemories.length > 0) {
      systemPrompt += "\n\n💾 RELEVANT MEMORIES (past conversations):\n" +
        relevantMemories.map(mem => `- ${mem.summary || mem.content.substring(0, 200)}`).join("\n");
    }
    
    // Add multi-step reasoning capabilities to system prompt
    systemPrompt += "\n\n🎯 CONVERSATION STYLE:\n" +
      "- Be friendly, warm, and approachable in your responses\n" +
      "- Use natural, conversational language\n" +
      "- Show empathy and understanding\n" +
      "- Keep responses clear and concise\n" +
      "- Ask clarifying questions when needed\n" +
      "- Acknowledge the user's concerns and feelings\n\n" +
      "✨ FORMATTING RULES:\n" +
      "- Use **bold text** for emphasis (e.g., **important points**)\n" +
      "- Create tables using markdown syntax:\n" +
      "  | Column 1 | Column 2 |\n" +
      "  |----------|----------|\n" +
      "  | Data 1   | Data 2   |\n" +
      "- Use bullet points with - or * for lists\n" +
      "- Use numbered lists when showing steps\n" +
      "- Add emojis occasionally to make responses friendlier (but don't overuse)\n" +
      "- Keep paragraphs short and scannable\n\n" +
      "🧠 MULTI-STEP REASONING WITH PARALLEL EXECUTION:\n" +
      "You have advanced reasoning capabilities with parallel tool execution. For complex tasks:\n" +
      "1. **Plan**: Break down the task into steps\n" +
      "2. **Execute in Parallel**: Call multiple tools simultaneously when needed\n" +
      "3. **Reflect**: Evaluate if you have enough information to answer\n" +
      "4. **Iterate**: If needed, use more tools or refine your approach\n" +
      "5. **Conclude**: Provide a comprehensive answer when you have all needed information\n\n" +
      "When using tools:\n" +
      "- **Call multiple tools at once** to gather information faster\n" +
      "- All tools execute in parallel, not sequentially\n" +
      "- Reflect on all tool results together to determine next steps\n" +
      "- If any tool fails, you still get results from others\n" +
      "- Continue until you have a complete answer or reach a natural conclusion\n\n" +
      "Example: If you need weather in multiple cities, call web_search for all cities at once rather than one by one.";
    
    // Add knowledge base context to system prompt
    if (knowledgeBase && knowledgeBase.length > 0) {
      systemPrompt += "\n\nKnowledge Base:\n" + 
        knowledgeBase.map(kb => `${kb.title}: ${kb.content}`).join("\n\n");
    }

    const startTime = Date.now();

    console.log('Agent connections:', JSON.stringify(connections, null, 2));

    // Build tools array based on enabled connections and their use cases
    const tools: any[] = [];
    
    // Add web search tool if enabled
    if (connections.web_search?.enabled && connections.web_search?.useCases?.instantAnswers) {
      tools.push({
        type: "function",
        function: {
          name: "web_search",
          description: "Search the web for real-time information, current events, facts, or any information not in your knowledge base",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query to look up on the web"
              }
            },
            required: ["query"]
          }
        }
      });
    }

    // Add YouTube tools if enabled with specific use cases
    if (connections.youtube?.enabled && connections.youtube?.apiKey) {
      const enabledActions = [];
      if (connections.youtube?.useCases?.analyzePerformance) enabledActions.push("analyze_performance");
      if (connections.youtube?.useCases?.autoModerate) enabledActions.push("moderate_comments");
      if (connections.youtube?.useCases?.generateMetadata) enabledActions.push("generate_metadata");
      if (connections.youtube?.useCases?.autoReply) enabledActions.push("reply_to_comment");
      if (connections.youtube?.useCases?.detectSpam) enabledActions.push("detect_spam");
      
      if (enabledActions.length > 0) {
        tools.push({
          type: "function",
          function: {
            name: "youtube_action",
            description: "Perform YouTube actions based on enabled features: " + enabledActions.join(", "),
            parameters: {
              type: "object",
              properties: {
                action: {
                  type: "string",
                  enum: enabledActions,
                  description: "The YouTube action to perform"
                },
                data: {
                  type: "object",
                  description: "Additional data required for the action (video_url, comment_id, etc.)"
                }
              },
              required: ["action"]
            }
          }
        });
      }
    }

    // Add Instagram tools if enabled with specific use cases
    if (connections.instagram?.enabled && connections.instagram?.apiKey) {
      const enabledActions = [];
      if (connections.instagram?.useCases?.autoReplyDMs) enabledActions.push("reply_dm");
      if (connections.instagram?.useCases?.autoReplyComments) enabledActions.push("reply_comment");
      if (connections.instagram?.useCases?.contentSuggestions) enabledActions.push("analyze_content");
      if (connections.instagram?.useCases?.leadQualification) enabledActions.push("qualify_lead");
      if (connections.instagram?.useCases?.keywordTriggers) enabledActions.push("keyword_response");
      
      if (enabledActions.length > 0) {
        tools.push({
          type: "function",
          function: {
            name: "instagram_action",
            description: "Perform Instagram actions based on enabled features: " + enabledActions.join(", "),
            parameters: {
              type: "object",
              properties: {
                action: {
                  type: "string",
                  enum: enabledActions,
                  description: "The Instagram action to perform"
                },
                data: {
                  type: "object",
                  description: "Additional data required (message, user_id, post_id, etc.)"
                }
              },
              required: ["action"]
            }
          }
        });
      }
    }

    // Add WhatsApp tools if enabled with specific use cases
    if (connections.whatsapp?.enabled && connections.whatsapp?.businessApiKey) {
      const enabledActions = [];
      if (connections.whatsapp?.useCases?.supportAgent) enabledActions.push("send_message");
      if (connections.whatsapp?.useCases?.orderTracking) enabledActions.push("track_order");
      if (connections.whatsapp?.useCases?.appointmentBooking) enabledActions.push("book_appointment");
      if (connections.whatsapp?.useCases?.productRecommendations) enabledActions.push("recommend_product");
      if (connections.whatsapp?.useCases?.catalogBrowsing) enabledActions.push("browse_catalog");
      if (connections.whatsapp?.useCases?.paymentReminders) enabledActions.push("send_reminder");
      
      if (enabledActions.length > 0) {
        tools.push({
          type: "function",
          function: {
            name: "whatsapp_action",
            description: "Perform WhatsApp Business actions based on enabled features: " + enabledActions.join(", "),
            parameters: {
              type: "object",
              properties: {
                action: {
                  type: "string",
                  enum: enabledActions,
                  description: "The WhatsApp action to perform"
                },
                data: {
                  type: "object",
                  description: "Additional data (phone, message, order_id, appointment_time, etc.)"
                }
              },
              required: ["action"]
            }
          }
        });
      }
    }

    // Add Email tools if enabled with specific use cases
    if (connections.email?.enabled && connections.email?.smtpHost) {
      const enabledActions = [];
      if (connections.email?.useCases?.autoReply) enabledActions.push("auto_reply");
      if (connections.email?.useCases?.categorize) enabledActions.push("categorize");
      if (connections.email?.useCases?.draftResponses) enabledActions.push("draft_response");
      if (connections.email?.useCases?.outboundCampaigns) enabledActions.push("send_campaign");
      if (connections.email?.useCases?.extractData) enabledActions.push("extract_data");
      
      if (enabledActions.length > 0) {
        tools.push({
          type: "function",
          function: {
            name: "email_action",
            description: "Perform email actions based on enabled features: " + enabledActions.join(", "),
            parameters: {
              type: "object",
              properties: {
                action: {
                  type: "string",
                  enum: enabledActions,
                  description: "The email action to perform"
                },
                data: {
                  type: "object",
                  description: "Additional data (to, subject, body, campaign_id, etc.)"
                }
              },
              required: ["action"]
            }
          }
        });
      }
    }

    // Add Telegram tools if enabled with specific use cases
    if (connections.telegram?.enabled && connections.telegram?.botToken) {
      const enabledActions = [];
      if (connections.telegram?.useCases?.autoReply) enabledActions.push("send_message");
      if (connections.telegram?.useCases?.groupModeration) enabledActions.push("moderate_group");
      if (connections.telegram?.useCases?.customCommands) enabledActions.push("execute_command");
      if (connections.telegram?.useCases?.scheduledMessages) enabledActions.push("schedule_message");
      if (connections.telegram?.useCases?.faqSupport) enabledActions.push("answer_faq");
      
      if (enabledActions.length > 0) {
        tools.push({
          type: "function",
          function: {
            name: "telegram_action",
            description: "Perform Telegram bot actions based on enabled features: " + enabledActions.join(", "),
            parameters: {
              type: "object",
              properties: {
                action: {
                  type: "string",
                  enum: enabledActions,
                  description: "The Telegram action to perform"
                },
                data: {
                  type: "object",
                  description: "Additional data (chat_id, message, command, schedule_time, etc.)"
                }
              },
              required: ["action"]
            }
          }
        });
      }
    }

    console.log(`Enabled tools (${tools.length}):`, tools.map(t => t.function.name).join(", "));

    // Store user message only if it's not already in the database
    const userMessage = messages[messages.length - 1];
    let savedUserMessageId = null;
    if (userMessage && userMessage.role === 'user') {
      const { data: existingMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!existingMessages || existingMessages.length === 0) {
        const { data: savedMessage } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: userMessage.content,
        }).select('id').single();
        
        savedUserMessageId = savedMessage?.id;
      } else {
        savedUserMessageId = existingMessages[0].id;
      }
    }

    // Handle non-streaming mode for webhooks
    if (!streamResponse) {
      const requestBody: any = {
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      };

      if (tools.length > 0) {
        requestBody.tools = tools;
      }

      const response = await fetch(aiBaseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const responseData = await response.json();
      const aiResponse = responseData.choices?.[0]?.message?.content || "I'm here to help!";
      
      const responseTime = Date.now() - startTime;
      const { data: savedMessage } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponse,
        response_time_ms: responseTime,
      }).select('id').single();

      return new Response(
        JSON.stringify({ 
          response: aiResponse,
          messageIds: {
            userMessageId: savedUserMessageId,
            assistantMessageId: savedMessage?.id
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Multi-step reasoning streaming mode
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const MAX_ITERATIONS = 5;
    
    const stream = new ReadableStream({
      async start(controller) {
        let conversationHistory = [...messages];
        let iteration = 0;
        let finalResponse = "";
        
        try {
          while (iteration < MAX_ITERATIONS) {
            iteration++;
            console.log(`\n=== Iteration ${iteration} ===`);
            
            // Create trace for iteration start
            await createTrace(
              iteration * 100,
              'reasoning',
              `Iteration ${iteration}`,
              'running',
              { iteration, conversationLength: conversationHistory.length },
              null,
              null,
              `Starting reasoning iteration ${iteration}`
            );
            
            // Send thinking event to frontend
            const thinkingEvent = JSON.stringify({
              type: 'thinking',
              content: iteration === 1 ? 'Let me think about this...' : 'Analyzing next step...',
              iteration,
              messageIds: {
                userMessageId: savedUserMessageId
              }
            });
            controller.enqueue(encoder.encode(`data: ${thinkingEvent}\n\n`));
            
            const iterationBody: any = {
              model: aiModel,
              messages: [
                { role: "system", content: systemPrompt },
                ...conversationHistory,
              ],
              stream: true,
            };
            
            if (tools.length > 0) {
              iterationBody.tools = tools;
            }
            
            const iterationResponse = await fetch(aiBaseUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${aiApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(iterationBody),
            });
            
            if (!iterationResponse.ok) {
              throw new Error(`AI gateway error: ${iterationResponse.status}`);
            }
            
            const reader = iterationResponse.body?.getReader();
            let textBuffer = "";
            let assistantMessage = "";
            let toolCalls: any[] = [];
            let toolCallBuffer = "";
            
            while (true) {
              const { done, value } = await reader!.read();
              if (done) break;
              
              textBuffer += decoder.decode(value, { stream: true });
              
              let newlineIndex: number;
              while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
                let line = textBuffer.slice(0, newlineIndex);
                textBuffer = textBuffer.slice(newlineIndex + 1);
                
                if (line.endsWith('\r')) line = line.slice(0, -1);
                if (!line.trim() || line.startsWith(':')) continue;
                
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim();
                  if (data === '[DONE]') continue;
                  
                  try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.choices?.[0]?.delta;
                    
                    if (delta?.content) {
                      assistantMessage += delta.content;
                      if (toolCalls.length === 0) {
                        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                      }
                    }
                    
                    if (delta?.tool_calls) {
                      const toolCall = delta.tool_calls[0];
                      if (toolCall?.function?.arguments) {
                        toolCallBuffer += toolCall.function.arguments;
                      }
                      if (toolCall?.function?.name && !toolCalls.find(tc => tc.id === toolCall.id)) {
                        toolCalls.push({
                          id: toolCall.id,
                          name: toolCall.function.name,
                          arguments: ""
                        });
                      }
                    }
                  } catch (e) {
                    textBuffer = line + '\n' + textBuffer;
                    break;
                  }
                }
              }
            }
            
            // If no tool calls, we're done
            if (toolCalls.length === 0) {
              finalResponse = assistantMessage;
              console.log("No tool calls, final response ready");
              
              // Send response event to frontend
              const responseEvent = JSON.stringify({
                type: 'response',
                content: 'Here\'s my answer...',
                iteration
              });
              controller.enqueue(encoder.encode(`data: ${responseEvent}\n\n`));
              
              // Create trace for final response
              await createTrace(
                iteration * 100 + 99,
                'response',
                'Final Response',
                'completed',
                null,
                { response: finalResponse.substring(0, 500) },
                null,
                'Generated final response to user'
              );
              
              break;
            }
            
            // Execute tool calls in parallel
            console.log(`Executing ${toolCalls.length} tool(s) in PARALLEL in iteration ${iteration}`);
            
            conversationHistory.push({
              role: "assistant",
              content: assistantMessage || null,
              tool_calls: toolCalls.map(tc => ({
                id: tc.id,
                type: "function",
                function: {
                  name: tc.name,
                  arguments: toolCallBuffer
                }
              }))
            });
            
            // Execute all tools in parallel using Promise.all
            const toolPromises = toolCalls.map(async (toolCall, index) => {
              const stepNumber = iteration * 100 + index + 1;
              const toolStartTime = Date.now();
              
              try {
                const parsedArgs = JSON.parse(toolCallBuffer);
                console.log(`[PARALLEL] Calling tool: ${toolCall.name} with args:`, parsedArgs);
                
                // Send tool execution start event to frontend
                const toolStartEvent = JSON.stringify({
                  type: 'tool_start',
                  toolName: toolCall.name,
                  args: parsedArgs,
                  iteration,
                  stepNumber
                });
                controller.enqueue(encoder.encode(`data: ${toolStartEvent}\n\n`));
                
                // Create trace for tool call start
                await createTrace(
                  stepNumber,
                  'tool',
                  toolCall.name,
                  'running',
                  parsedArgs,
                  null,
                  null,
                  `Executing ${toolCall.name} tool`
                );
                
                const toolResult = await supabase.functions.invoke('chat-tools', {
                  body: {
                    toolName: toolCall.name,
                    arguments: parsedArgs,
                    agentId,
                    connections
                  }
                });
                
                if (toolResult.error) {
                  console.error(`[PARALLEL] Tool ${toolCall.name} error:`, toolResult.error);
                  
                  // Create trace for tool error
                  await createTrace(
                    stepNumber,
                    'tool',
                    toolCall.name,
                    'error',
                    parsedArgs,
                    null,
                    toolResult.error.message,
                    `Failed to execute ${toolCall.name}`
                  );
                  
                  return {
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify({ error: toolResult.error.message }),
                    toolName: toolCall.name,
                    success: false
                  };
                } else {
                  console.log(`[PARALLEL] Tool ${toolCall.name} completed successfully`);
                  
                  const duration = Date.now() - toolStartTime;
                  
                  // Send tool completion event to frontend
                  const toolCompleteEvent = JSON.stringify({
                    type: 'tool_complete',
                    toolName: toolCall.name,
                    result: toolResult.data?.result,
                    duration,
                    success: true,
                    stepNumber
                  });
                  controller.enqueue(encoder.encode(`data: ${toolCompleteEvent}\n\n`));
                  
                  // Create trace for tool success
                  await createTrace(
                    stepNumber,
                    'tool',
                    toolCall.name,
                    'completed',
                    parsedArgs,
                    toolResult.data?.result,
                    null,
                    `Successfully executed ${toolCall.name}`
                  );
                  
                  return {
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(toolResult.data?.result || {}),
                    toolName: toolCall.name,
                    success: true
                  };
                }
              } catch (error) {
                console.error(`[PARALLEL] Tool execution error for ${toolCall.name}:`, error);
                
                // Create trace for tool exception
                await createTrace(
                  stepNumber,
                  'tool',
                  toolCall.name,
                  'error',
                  null,
                  null,
                  error instanceof Error ? error.message : 'Unknown error',
                  `Exception during ${toolCall.name} execution`
                );
                
                return {
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ error: "Tool execution failed" }),
                  toolName: toolCall.name,
                  success: false
                };
              }
            });
            
            // Wait for all tools to complete in parallel
            const toolResults = await Promise.all(toolPromises);
            
            // Add all results to conversation history
            console.log(`[PARALLEL] All ${toolResults.length} tools completed`);
            toolResults.forEach(result => {
              console.log(`[PARALLEL] ${result.toolName}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
              conversationHistory.push({
                role: result.role,
                tool_call_id: result.tool_call_id,
                content: result.content
              });
            });
            
            // Add reflection prompt for next iteration
            if (iteration < MAX_ITERATIONS) {
              conversationHistory.push({
                role: "user",
                content: "Based on the tool results above, do you have enough information to provide a complete answer? If yes, provide your final response. If no, use more tools to gather additional information."
              });
            }
          }
          
          // If we hit max iterations, generate final response
          if (iteration >= MAX_ITERATIONS && !finalResponse) {
            console.log("Max iterations reached, generating final response");
            const finalBody: any = {
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: systemPrompt },
                ...conversationHistory,
                { role: "user", content: "Please provide your best answer based on all the information gathered." }
              ],
              stream: true,
            };
            
            const finalCall = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(finalBody),
            });
            
            if (finalCall.ok && finalCall.body) {
              const finalReader = finalCall.body.getReader();
              let textBuffer = "";
              
              while (true) {
                const { done, value } = await finalReader.read();
                if (done) break;
                
                textBuffer += decoder.decode(value, { stream: true });
                
                let newlineIndex: number;
                while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
                  let line = textBuffer.slice(0, newlineIndex);
                  textBuffer = textBuffer.slice(newlineIndex + 1);
                  
                  if (line.endsWith('\r')) line = line.slice(0, -1);
                  if (!line.trim() || line.startsWith(':')) continue;
                  
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') continue;
                    
                    try {
                      const parsed = JSON.parse(data);
                      const delta = parsed.choices?.[0]?.delta;
                      
                      if (delta?.content) {
                        finalResponse += delta.content;
                        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                      }
                    } catch {
                      textBuffer = line + '\n' + textBuffer;
                      break;
                    }
                  }
                }
              }
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));

          const responseTime = Date.now() - startTime;
          let assistantMessageId = null;
          if (finalResponse) {
            console.log(`Storing final response (${finalResponse.length} chars) after ${iteration} iterations`);
            const { data: savedMessage } = await supabase.from('messages').insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: finalResponse,
              response_time_ms: responseTime,
            }).select('id').single();
            
            assistantMessageId = savedMessage?.id;

            // Store conversation as memory in background (don't await)
            if (userId && lastUserMessage) {
              const memoryContent = `User: ${lastUserMessage.content}\nAssistant: ${finalResponse}`;
              supabase.functions.invoke('store-memory', {
                body: {
                  content: memoryContent,
                  agentId,
                  conversationId,
                  userId,
                  importanceScore: 0.6
                }
              }).catch(err => console.error('Background memory storage error:', err));
            }
          }
          
          // Send message IDs to frontend
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'message_ids',
            messageIds: {
              userMessageId: savedUserMessageId,
              assistantMessageId
            }
          })}\n\n`));

          controller.close();
        } catch (error) {
          console.error('Multi-step reasoning error:', error);
          const errorMsg = "I encountered an error during my reasoning process. Please try again.";
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            choices: [{
              delta: { content: errorMsg }
            }]
          })}\n\n`));
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          
          const { data: savedErrorMessage } = await supabase.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: errorMsg,
            response_time_ms: Date.now() - startTime,
          }).select('id').single();
          
          // Send message IDs even in error case
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'message_ids',
            messageIds: {
              userMessageId: savedUserMessageId,
              assistantMessageId: savedErrorMessage?.id
            }
          })}\n\n`));
          
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
