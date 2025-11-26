import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, ThumbsUp, ThumbsDown, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  reaction?: "up" | "down";
  id: string;
}

export const InteractiveChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm notants Agent. Ask me anything about AI Support Desk!",
      timestamp: new Date(),
      id: crypto.randomUUID(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleReaction = (messageId: string, reaction: "up" | "down") => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, reaction: msg.reaction === reaction ? undefined : reaction }
          : msg
      )
    );
    toast({
      description: reaction === "up" ? "Thanks for your feedback!" : "We'll work on improving!",
    });
  };

  const handleCopy = async (content: string, messageId: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(messageId);
    toast({
      description: "Message copied to clipboard",
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage, timestamp: new Date(), id: crypto.randomUUID() }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat-support", {
        body: { message: userMessage, conversationHistory: messages },
      });

      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response, timestamp: new Date(), id: crypto.randomUUID() },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
          id: crypto.randomUUID(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background/95 backdrop-blur-xl border-2 border-border/50 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-shadow duration-300">
      <div className="bg-gradient-to-r from-primary/15 via-accent/10 to-primary/15 px-3 md:px-4 py-3 md:py-4 border-b border-border/50">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm md:text-base text-foreground">notants Agent</h3>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              AI-Powered Support Assistant
            </p>
          </div>
          <Badge variant="secondary" className="text-[9px] md:text-xs px-2 py-0.5 md:px-3 md:py-1 hidden sm:flex">
            built in 5 mins on AI Support Desk.
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 min-h-0 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col animate-fade-in ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[85%] md:max-w-[80%] rounded-xl md:rounded-2xl px-3 py-2.5 md:px-4 md:py-3 shadow-md hover:shadow-lg transition-all duration-200 ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground"
                  : "bg-gradient-to-br from-muted to-muted/80 text-foreground border border-border/30"
              }`}
            >
              <div className="text-xs md:text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-table:text-xs md:prose-table:text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              </div>
              <p className={`text-[10px] md:text-xs mt-1.5 ${
                msg.role === "user"
                  ? "text-primary-foreground/70"
                  : "text-muted-foreground"
              }`}>
                {format(msg.timestamp, "h:mm a")}
              </p>
            </div>
            {msg.role === "assistant" && (
              <div className="flex items-center gap-0.5 md:gap-1 mt-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 md:h-7 md:w-7 p-0 hover:bg-primary/10 active:scale-95 transition-all touch-manipulation"
                  onClick={() => handleCopy(msg.content, msg.id)}
                >
                  {copiedId === msg.id ? (
                    <Check className="w-3.5 h-3.5 md:w-3 md:h-3 text-primary" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 md:w-3 md:h-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 md:h-7 md:w-7 p-0 hover:bg-primary/10 active:scale-95 transition-all touch-manipulation ${msg.reaction === "up" ? "text-primary bg-primary/10" : ""}`}
                  onClick={() => handleReaction(msg.id, "up")}
                >
                  <ThumbsUp className="w-3.5 h-3.5 md:w-3 md:h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 md:h-7 md:w-7 p-0 hover:bg-destructive/10 active:scale-95 transition-all touch-manipulation ${msg.reaction === "down" ? "text-destructive bg-destructive/10" : ""}`}
                  onClick={() => handleReaction(msg.id, "down")}
                >
                  <ThumbsDown className="w-3.5 h-3.5 md:w-3 md:h-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-gradient-to-br from-muted to-muted/80 rounded-xl md:rounded-2xl px-4 py-3 shadow-md border border-border/30">
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin text-primary" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border/50 p-3 md:p-4 bg-background/50 backdrop-blur-sm">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about features, pricing..."
            className="flex-1 h-10 md:h-11 text-sm md:text-base border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="h-10 w-10 md:h-11 md:w-11 shrink-0 shadow-lg hover:shadow-xl active:scale-95 transition-all touch-manipulation disabled:opacity-50"
          >
            <Send className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
