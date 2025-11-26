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
    const { toolName, tool, arguments: args, parameters, agentId, connections } = await req.json();
    
    // Support both old and new parameter formats
    const toolToUse = toolName || tool;
    const paramsToUse = args || parameters;

    let result;

    switch (toolToUse) {
      case "web_search":
        console.log(`Web search query: "${paramsToUse.query}"`);
        try {
          // Try DuckDuckGo Instant Answer API first
          const instantResponse = await fetch(
            `https://api.duckduckgo.com/?q=${encodeURIComponent(paramsToUse.query)}&format=json&no_html=1`
          );
          const instantData = await instantResponse.json();
          
          console.log(`DuckDuckGo response:`, instantData.AbstractText ? 'Has abstract' : 'No abstract');
          
          // If we have a good instant answer, use it
          if (instantData.AbstractText) {
            result = {
              query: paramsToUse.query,
              results: [{
                title: instantData.Heading || paramsToUse.query,
                url: instantData.AbstractURL || instantData.AbstractSource || '',
                description: instantData.AbstractText
              }]
            };
          } else if (instantData.RelatedTopics && instantData.RelatedTopics.length > 0) {
            // Use related topics as results
            const topics = instantData.RelatedTopics
              .filter((topic: any) => topic.FirstURL && topic.Text)
              .slice(0, 5)
              .map((topic: any) => ({
                title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
                url: topic.FirstURL,
                description: topic.Text
              }));
            
            if (topics.length > 0) {
              console.log(`Found ${topics.length} DuckDuckGo related topics`);
              result = {
                query: paramsToUse.query,
                results: topics
              };
            } else {
              // Fallback to Wikipedia for factual queries
              console.log('No DuckDuckGo results, trying Wikipedia');
              const wikiResponse = await fetch(
                `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(paramsToUse.query)}`
              );
              
              if (wikiResponse.ok) {
                const wikiData = await wikiResponse.json();
                console.log(`Wikipedia response: ${wikiData.title || 'found'}`);
                
                if (wikiData.extract) {
                  result = {
                    query: paramsToUse.query,
                    results: [{
                      title: wikiData.title,
                      url: wikiData.content_urls?.desktop?.page || '',
                      description: wikiData.extract
                    }]
                  };
                } else {
                  result = {
                    query: paramsToUse.query,
                    results: [{
                      title: "No results found",
                      description: `Could not find information about "${paramsToUse.query}"`
                    }]
                  };
                }
              } else {
                result = {
                  query: paramsToUse.query,
                  results: [{
                    title: "No results found",
                    description: `Could not find information about "${paramsToUse.query}"`
                  }]
                };
              }
            }
          } else {
            // Fallback to Wikipedia
            console.log('No DuckDuckGo instant answer, trying Wikipedia');
            const wikiResponse = await fetch(
              `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(paramsToUse.query)}`
            );
            
            if (wikiResponse.ok) {
              const wikiData = await wikiResponse.json();
              console.log(`Wikipedia response: ${wikiData.title || 'found'}`);
              
              if (wikiData.extract) {
                result = {
                  query: paramsToUse.query,
                  results: [{
                    title: wikiData.title,
                    url: wikiData.content_urls?.desktop?.page || '',
                    description: wikiData.extract
                  }]
                };
              } else {
                result = {
                  query: paramsToUse.query,
                  results: [{
                    title: "No results found",
                    description: `Could not find information about "${paramsToUse.query}"`
                  }]
                };
              }
            } else {
              result = {
                query: paramsToUse.query,
                results: [{
                  title: "No results found",
                  description: `Could not find information about "${paramsToUse.query}"`
                }]
              };
            }
          }
        } catch (error) {
          console.error('Web search error:', error);
          result = {
            query: paramsToUse.query,
            results: [{
              title: "Search temporarily unavailable",
              description: "Please try again in a moment"
            }],
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
        break;

      case "youtube_action": {
        const { action, videoId, apiKey } = paramsToUse;
        
        if (!apiKey) {
          result = {
            result: "Error: YouTube API key is required",
            action,
            status: "error"
          };
          break;
        }

        if (action === "get_video_stats" && videoId) {
          try {
            const response = await fetch(
              `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoId}&key=${apiKey}`
            );
            const data = await response.json();
            
            if (data.items && data.items.length > 0) {
              const video = data.items[0];
              result = {
                result: `Video stats for "${video.snippet.title}": ${video.statistics.viewCount} views, ${video.statistics.likeCount} likes, ${video.statistics.commentCount} comments`,
                action,
                status: "success",
                data: video
              };
            } else {
              result = {
                result: "Video not found",
                action,
                status: "error"
              };
            }
          } catch (error) {
            result = {
              result: `Error fetching video stats: ${error instanceof Error ? error.message : "Unknown error"}`,
              action,
              status: "error"
            };
          }
        } else {
          result = {
            result: `YouTube action '${action}' prepared for execution.`,
            action,
            status: "pending",
            parameters
          };
        }
        break;
      }

      case "instagram_action": {
        const { action, recipientId, message, accessToken } = paramsToUse;
        
        if (!accessToken) {
          result = {
            result: "Error: Instagram access token is required",
            action,
            status: "error"
          };
          break;
        }

        if (action === "send_message" && recipientId && message) {
          try {
            const response = await fetch(
              `https://graph.facebook.com/v18.0/me/messages`,
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${accessToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  recipient: { id: recipientId },
                  message: { text: message }
                })
              }
            );

            const data = await response.json();
            
            if (data.message_id) {
              result = {
                result: `Message sent to Instagram user ${recipientId}: "${message}"`,
                action,
                status: "success",
                messageId: data.message_id
              };
            } else {
              result = {
                result: `Failed to send message: ${data.error?.message || "Unknown error"}`,
                action,
                status: "error"
              };
            }
          } catch (error) {
            result = {
              result: `Error sending Instagram message: ${error instanceof Error ? error.message : "Unknown error"}`,
              action,
              status: "error"
            };
          }
        } else {
          result = {
            result: `Instagram action '${action}' prepared for execution.`,
            action,
            status: "pending",
            parameters
          };
        }
        break;
      }

      case "whatsapp_action": {
        const { action, phoneNumber, message, phoneNumberId, accessToken } = paramsToUse;
        
        if (!accessToken || !phoneNumberId) {
          result = {
            result: "Error: WhatsApp access token and phone number ID are required",
            action,
            status: "error"
          };
          break;
        }

        if (action === "send_message" && phoneNumber && message) {
          try {
            const response = await fetch(
              `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${accessToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: phoneNumber,
                  text: { body: message }
                })
              }
            );

            const data = await response.json();
            
            if (data.messages) {
              result = {
                result: `Message sent to WhatsApp ${phoneNumber}: "${message}"`,
                action,
                status: "success",
                messageId: data.messages[0].id
              };
            } else {
              result = {
                result: `Failed to send message: ${data.error?.message || "Unknown error"}`,
                action,
                status: "error"
              };
            }
          } catch (error) {
            result = {
              result: `Error sending WhatsApp message: ${error instanceof Error ? error.message : "Unknown error"}`,
              action,
              status: "error"
            };
          }
        } else {
          result = {
            result: `WhatsApp action '${action}' prepared for execution.`,
            action,
            status: "pending",
            parameters
          };
        }
        break;
      }

      case "email_action": {
        const { action, to, subject, body, smtpConfig } = paramsToUse;
        
        if (!smtpConfig) {
          result = {
            result: "Error: SMTP configuration is required",
            action,
            status: "error"
          };
          break;
        }

        if (action === "send_email" && to && subject && body) {
          try {
            // Use Deno's SMTP client
            const { SmtpClient } = await import("https://deno.land/x/smtp@v0.7.0/mod.ts");
            const client = new SmtpClient();

            await client.connectTLS({
              hostname: smtpConfig.smtpHost,
              port: parseInt(smtpConfig.smtpPort),
              username: smtpConfig.smtpUsername,
              password: smtpConfig.smtpPassword,
            });

            await client.send({
              from: smtpConfig.smtpUsername,
              to: to,
              subject: subject,
              content: body,
            });

            await client.close();

            result = {
              result: `Email sent to ${to} with subject "${subject}"`,
              action,
              status: "success",
              to,
              subject
            };
          } catch (error) {
            result = {
              result: `Error sending email: ${error instanceof Error ? error.message : "Unknown error"}`,
              action,
              status: "error"
            };
          }
        } else {
          result = {
            result: `Email action '${action}' prepared for execution.`,
            action,
            status: "pending",
            parameters
          };
        }
        break;
      }

      case "telegram_action": {
        const { action, data } = paramsToUse;
        const { chatId, message } = data || {};
        
        // Get bot token from connections
        const botToken = connections?.telegram?.botToken;
        
        if (!botToken) {
          result = {
            result: "Error: Bot token is required for Telegram actions. Please configure Telegram connection in agent settings.",
            action,
            status: "error"
          };
          break;
        }

        if (action === "send_message" && message) {
          // If chatId not provided in data, try to get it from a default or fail gracefully
          const targetChatId = chatId || connections?.telegram?.defaultChatId;
          if (!targetChatId) {
            result = {
              result: "Error: No chat ID provided. I need a Telegram chat ID to send messages.",
              action: "send_message",
              status: "error"
            };
            break;
          }

          try {
            const telegramResponse = await fetch(
              `https://api.telegram.org/bot${botToken}/sendMessage`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: targetChatId,
                  text: message,
                  parse_mode: "Markdown",
                }),
              }
            );

            const telegramResult = await telegramResponse.json();
            
            if (telegramResult.ok) {
              result = {
                result: `Message sent successfully via Telegram: "${message}"`,
                action: "send_message",
                status: "success",
                chatId: targetChatId,
                message,
                messageId: telegramResult.result.message_id,
              };
            } else {
              result = {
                result: `Failed to send message: ${telegramResult.description}`,
                action: "send_message",
                status: "error",
                chatId: targetChatId,
                message,
                errorDetails: telegramResult
              };
            }
          } catch (error) {
            result = {
              result: `Error sending message: ${error instanceof Error ? error.message : "Unknown error"}`,
              action: "send_message",
              status: "error",
            };
          }
        } else {
          result = {
            result: `Telegram action '${action}' prepared for execution.`,
            action,
            status: "pending",
            parameters,
          };
        }
        break;
      }

      default:
        throw new Error(`Unknown tool: ${toolToUse}`);
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Tool execution error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
