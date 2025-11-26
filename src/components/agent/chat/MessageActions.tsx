import { Copy, RotateCcw, Check, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MessageActionsProps {
  content: string;
  messageId?: string;
  onRegenerate?: () => void;
}

export function MessageActions({ content, messageId, onRegenerate }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (messageId) {
      loadFeedback();
    }
  }, [messageId]);

  const loadFeedback = async () => {
    if (!messageId) return;
    
    const { data } = await supabase
      .from('message_feedback')
      .select('rating')
      .eq('message_id', messageId)
      .single();

    if (data) {
      setFeedback(data.rating === 1 ? 'like' : 'dislike');
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = async (type: 'like' | 'dislike') => {
    if (!messageId) return;

    try {
      const rating = type === 'like' ? 1 : 0;
      
      // Check if feedback exists
      const { data: existing } = await supabase
        .from('message_feedback')
        .select('id')
        .eq('message_id', messageId)
        .single();

      if (existing) {
        // Update existing feedback
        await supabase
          .from('message_feedback')
          .update({ rating })
          .eq('message_id', messageId);
      } else {
        // Insert new feedback
        await supabase
          .from('message_feedback')
          .insert({ message_id: messageId, rating });
      }

      setFeedback(type);
      toast({
        title: "Feedback recorded",
        description: `Thank you for your ${type === 'like' ? '👍' : '👎'} feedback!`,
      });
    } catch (error) {
      console.error('Feedback error:', error);
      toast({
        title: "Error",
        description: "Failed to record feedback",
        variant: "destructive",
      });
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{copied ? "Copied!" : "Copy"}</p>
          </TooltipContent>
        </Tooltip>

        {messageId && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => handleFeedback('like')}
                >
                  <ThumbsUp className={`h-3.5 w-3.5 ${feedback === 'like' ? "fill-primary text-primary" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Like</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => handleFeedback('dislike')}
                >
                  <ThumbsDown className={`h-3.5 w-3.5 ${feedback === 'dislike' ? "fill-destructive text-destructive" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Dislike</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {onRegenerate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={onRegenerate}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Regenerate</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
