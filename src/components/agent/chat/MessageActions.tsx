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
        {messageId && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleFeedback('like')}
                  className={`h-7 w-7 hover:bg-muted ${
                    feedback === 'like' ? 'text-green-500' : ''
                  }`}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Like</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleFeedback('dislike')}
                  className={`h-7 w-7 hover:bg-muted ${
                    feedback === 'dislike' ? 'text-red-500' : ''
                  }`}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Dislike</TooltipContent>
            </Tooltip>
          </>
        )}
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCopy}
              className="h-7 w-7 hover:bg-muted"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy message</TooltipContent>
        </Tooltip>

        {onRegenerate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={onRegenerate}
                className="h-7 w-7 hover:bg-muted"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Regenerate response</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
