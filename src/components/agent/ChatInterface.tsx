import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, StopCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { CodeBlock } from "./chat/CodeBlock";
import { MessageActions } from "./chat/MessageActions";
import { TypingText } from "@/components/ui/typing-text";
import { ChatInput } from "./ChatInput";

interface Agent {
  id: string;
  name: string;
  system_prompt: string | null;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  thinkingSteps?: Array<{
    id: string;
    status: "thinking" | "tool" | "complete" | "error";
    content: string;
    toolName?: string;
    timestamp: number;
  }>;
  isThinking?: boolean;
  elapsedTime?: number;
}

interface ChatInterfaceProps {
  agent: Agent;
  conversationId: string | null;
  onConversationChange: (conversationId: string) => void;
}

export function ChatInterface({ agent, conversationId, onConversationChange }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      initConversation();
    }
  }, [conversationId, agent.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initConversation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        agent_id: agent.id,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      return;
    }

    onConversationChange(data.id);
    setMessages([]);
  };

  const loadConversation = async (convId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading conversation:", error);
      return;
    }

    const loadedMessages: Message[] = data.map((msg) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant",
      content: msg.content,
      timestamp: msg.created_at,
    }));

    setMessages(loadedMessages);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !conversationId) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setIsStreaming(true);

    const assistantMessageId = crypto.randomUUID();
    const startTime = Date.now();
    
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      thinkingSteps: [],
      isThinking: true,
      elapsedTime: 0,
    };
    
    setMessages((prev) => [...prev, assistantMessage]);
    
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          agentId: agent.id,
          conversationId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let aiContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.trim() || line.startsWith(':')) continue;
          
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') {
              setIsStreaming(false);
              setLoading(false);
              continue;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const elapsed = Date.now() - startTime;
              
              if (parsed.type === 'thinking') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          thinkingSteps: [
                            ...(m.thinkingSteps || []),
                            {
                              id: crypto.randomUUID(),
                              status: "thinking" as const,
                              content: parsed.content,
                              timestamp: Date.now(),
                            },
                          ],
                          elapsedTime: elapsed,
                        }
                      : m
                  )
                );
              } else if (parsed.type === 'tool_start') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          thinkingSteps: [
                            ...(m.thinkingSteps || []),
                            {
                              id: crypto.randomUUID(),
                              status: "tool" as const,
                              content: `Using ${parsed.toolName}...`,
                              toolName: parsed.toolName,
                              timestamp: Date.now(),
                            },
                          ],
                          elapsedTime: elapsed,
                        }
                      : m
                  )
                );
              } else if (parsed.type === 'tool_complete') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          thinkingSteps: [
                            ...(m.thinkingSteps || []),
                            {
                              id: crypto.randomUUID(),
                              status: "complete" as const,
                              content: `${parsed.toolName} completed`,
                              toolName: parsed.toolName,
                              timestamp: Date.now(),
                            },
                          ],
                          elapsedTime: elapsed,
                        }
                      : m
                  )
                );
              } else if (parsed.type === 'response') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, isThinking: false, elapsedTime: elapsed }
                      : m
                  )
                );
              } else {
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  aiContent += content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: aiContent, elapsedTime: elapsed }
                        : m
                    )
                  );
                }
              }
            } catch (e) {
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("Request aborted");
      } else {
        console.error('Chat error:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to get response",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto scrollbar-hide px-4"
      >
        <div className="max-w-4xl mx-auto py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-16rem)] space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center border-2 border-primary/20 shadow-xl">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-foreground">
                  Let&apos;s chat or do something
                </h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  Start a conversation with your AI assistant
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isLastMessage = index === messages.length - 1;
                const isStreamingThis = isLastMessage && isStreaming && message.role === "assistant";

                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`group max-w-[80%] space-y-2 ${
                        message.role === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 border border-border/50"
                        }`}
                      >
                        {message.role === "assistant" && message.thinkingSteps && message.thinkingSteps.length > 0 && (
                          <ThinkingIndicator
                            steps={message.thinkingSteps}
                            isActive={message.isThinking || false}
                            elapsedTime={message.elapsedTime}
                            compact
                          />
                        )}
                        
                        {message.role === "user" ? (
                          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                        ) : (
                          message.content && (
                            <div>
                              {isStreamingThis ? (
                                <div className="prose prose-sm max-w-none">
                                  <TypingText
                                    text={message.content}
                                    speed={10}
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="prose prose-sm max-w-none">
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      components={{
                                        p: ({ children }) => (
                                          <p className="mb-3 last:mb-0 leading-relaxed text-[15px]">
                                            {children}
                                          </p>
                                        ),
                                        code: ({ className, children }) => {
                                          const match = /language-(\w+)/.exec(className || "");
                                          const isInline = !match;
                                          return isInline ? (
                                            <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">
                                              {children}
                                            </code>
                                          ) : null;
                                        },
                                        pre: ({ children }) => {
                                          const codeElement = children as any;
                                          const match = /language-(\w+)/.exec(
                                            codeElement?.props?.className || ""
                                          );
                                          const language = match ? match[1] : "text";
                                          const code = String(
                                            codeElement?.props?.children || ""
                                          ).replace(/\n$/, "");

                                          return <CodeBlock code={code} language={language} />;
                                        },
                                        ul: ({ children }) => (
                                          <ul className="list-disc list-inside space-y-1.5 my-3">
                                            {children}
                                          </ul>
                                        ),
                                        ol: ({ children }) => (
                                          <ol className="list-decimal list-inside space-y-1.5 my-3">
                                            {children}
                                          </ol>
                                        ),
                                        a: ({ href, children }) => (
                                          <a
                                            href={href}
                                            className="text-primary hover:underline"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            {children}
                                          </a>
                                        ),
                                      }}
                                    >
                                      {message.content}
                                    </ReactMarkdown>
                                  </div>
                                  
                                  {!isStreamingThis && (
                                    <div className="mt-2 pt-2 border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <MessageActions content={message.content} />
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Centered */}
      <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t border-border/30 py-4">
        {loading && (
          <div className="flex justify-center mb-2">
            <Button
              onClick={handleStop}
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10"
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Stop
            </Button>
          </div>
        )}
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={loading}
          loading={loading}
        />
      </div>
    </div>
  );
}
