import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2, User, Bot, StopCircle, Download, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CodeBlock } from "./chat/CodeBlock";
import { MessageActions } from "./chat/MessageActions";
import { AutoResizeTextarea } from "./chat/AutoResizeTextarea";
import { TypingText } from "@/components/ui/typing-text";
import { ConversationSidebar } from "./ConversationSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

    const welcomeMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: agent.system_prompt || "Hello! How can I assist you today?",
      timestamp: new Date().toISOString(),
    };

    setMessages([welcomeMessage]);
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

  const exportConversation = () => {
    const markdown = messages
      .map((msg) => `**${msg.role}**: ${msg.content}`)
      .join("\n\n");
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-${agent.name}-${format(new Date(), "yyyy-MM-dd")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Exported",
      description: "Conversation exported as markdown",
    });
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
    <div className="flex h-full">
      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-80">
          <ConversationSidebar
            agentId={agent.id}
            currentConversationId={conversationId}
            onConversationSelect={(id) => {
              onConversationChange(id);
              setSidebarOpen(false);
            }}
            onNewChat={() => {
              onConversationChange("");
              setSidebarOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>

      <div className="flex flex-col flex-1 h-full relative">
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/50 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden hover:bg-muted/50"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center border-2 border-primary/30 shadow-md">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-base">{agent.name}</span>
                  <span className="text-xs text-muted-foreground">AI Assistant</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={exportConversation}
                disabled={messages.length === 0}
                className="hover:bg-muted/50"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-in fade-in-50">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center backdrop-blur-sm border-2 border-primary/20 shadow-2xl">
                    <Bot className="w-12 h-12 text-primary drop-shadow-lg" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg">
                    AI
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                    Start a conversation
                  </h3>
                  <p className="text-muted-foreground text-base max-w-md leading-relaxed">
                    Ask me anything and I'll help you with detailed, thoughtful responses
                  </p>
                </div>
              </div>
            )}

            {messages.map((message, index) => {
              const isLastMessage = index === messages.length - 1;
              const isStreamingThis = isLastMessage && isStreaming && message.role === "assistant";

              return (
                <div key={message.id} className="space-y-4">
                  {/* Thinking Indicator */}
                  {message.role === "assistant" && message.thinkingSteps && message.thinkingSteps.length > 0 && (
                    <ThinkingIndicator
                      steps={message.thinkingSteps}
                      isActive={message.isThinking || false}
                      elapsedTime={message.elapsedTime}
                    />
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`group flex gap-4 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    } animate-in slide-in-from-bottom-3 fade-in-50 duration-500`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center border-2 border-primary/20 shadow-lg">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    
                    <div
                      className={`flex flex-col ${
                        message.role === "user" ? "items-end" : "items-start"
                      } max-w-[85%] space-y-2`}
                    >
                      <div
                        className={`relative ${
                          message.role === "user"
                            ? "bg-primary/10 border-2 border-primary/30 rounded-3xl px-6 py-4 shadow-md hover:shadow-lg transition-all"
                            : ""
                        }`}
                      >
                        {message.role === "user" ? (
                          <p className="whitespace-pre-wrap break-words text-base leading-relaxed">
                            {message.content}
                          </p>
                        ) : (
                          message.content && (
                            <div className="bg-card/50 border-2 border-border/50 rounded-3xl px-6 py-4 shadow-md hover:shadow-xl transition-all backdrop-blur-sm">
                              {isStreamingThis ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                  <TypingText
                                    text={message.content}
                                    speed={10}
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      components={{
                                      p: ({ children }) => (
                                        <p className="mb-4 last:mb-0 leading-relaxed text-base">
                                          {children}
                                        </p>
                                      ),
                                      code: ({ className, children }) => {
                                        const match = /language-(\w+)/.exec(className || "");
                                        const isInline = !match;
                                        return isInline ? (
                                          <code className="px-2 py-1 rounded-md bg-muted/70 text-sm border border-border font-mono text-foreground">
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
                                        <ul className="list-disc list-inside space-y-2 my-4 pl-2">
                                          {children}
                                        </ul>
                                      ),
                                      ol: ({ children }) => (
                                        <ol className="list-decimal list-inside space-y-2 my-4 pl-2">
                                          {children}
                                        </ol>
                                      ),
                                      a: ({ href, children }) => (
                                        <a
                                          href={href}
                                          className="text-primary hover:underline underline-offset-4 transition-all font-medium"
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          {children}
                                        </a>
                                      ),
                                      blockquote: ({ children }) => (
                                        <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-4">
                                          {children}
                                        </blockquote>
                                      ),
                                      h1: ({ children }) => (
                                        <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>
                                      ),
                                      h2: ({ children }) => (
                                        <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>
                                      ),
                                      h3: ({ children }) => (
                                        <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>
                                      ),
                                      }}
                                    >
                                      {message.content}
                                    </ReactMarkdown>
                                  </div>
                                  
                                  <div className="mt-4 pt-3 border-t border-border/30">
                                    <MessageActions content={message.content} />
                                  </div>
                                </>
                              )}
                            </div>
                          )
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 px-2">
                        <span className="text-xs text-muted-foreground font-medium">
                          {format(new Date(message.timestamp), "h:mm a")}
                        </span>
                      </div>
                    </div>

                    {message.role === "user" && (
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-foreground/10 to-transparent flex items-center justify-center border-2 border-foreground/10 shadow-md">
                        <User className="w-5 h-5 text-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="sticky bottom-0 backdrop-blur-xl bg-background/95 border-t border-border/50 px-4 py-4 shadow-lg">
          <div className="max-w-5xl mx-auto">
            <div className="relative flex gap-3 items-end">
              <AutoResizeTextarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your message... (⌘+Enter to send)"
                className="pr-24 rounded-2xl border-2 focus:border-primary transition-all shadow-sm hover:shadow-md bg-background/50 backdrop-blur-sm"
                disabled={loading}
                maxHeight={200}
              />
              <div className="absolute right-2 bottom-2 flex gap-2">
                {loading && (
                  <Button
                    onClick={handleStop}
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 rounded-xl hover:bg-destructive/10 transition-all"
                  >
                    <StopCircle className="h-5 w-5 text-destructive" />
                  </Button>
                )}
                <Button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  size="icon"
                  className="h-10 w-10 rounded-xl shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-primary to-primary/80 disabled:opacity-50"
                >
                  {loading && !isStreaming ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              {input.length} characters • Press ⌘+Enter to send
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
