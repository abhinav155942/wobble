import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIEnhanceButtonProps {
  value: string;
  onEnhanced: (enhanced: string) => void;
  type: "system_prompt" | "description" | "faq" | "knowledge_base" | "greeting" | "general";
  disabled?: boolean;
}

export function AIEnhanceButton({ value, onEnhanced, type, disabled }: AIEnhanceButtonProps) {
  const [enhancing, setEnhancing] = useState(false);
  const { toast } = useToast();

  const handleEnhance = async () => {
    if (!value.trim()) {
      toast({
        title: "No content",
        description: "Please enter some text first",
        variant: "destructive",
      });
      return;
    }

    setEnhancing(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enhance-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          text: value,
          promptType: type, // Pass type directly - backend handles sophisticated prompts
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to enhance text');
      }

      const data = await response.json();
      
      if (data.enhanced) {
        onEnhanced(data.enhanced);
        toast({
          title: "Text enhanced!",
          description: "Your text has been improved by AI",
        });
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      toast({
        title: "Enhancement failed",
        description: error instanceof Error ? error.message : "Failed to enhance text",
        variant: "destructive",
      });
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleEnhance}
      disabled={enhancing || disabled || !value.trim()}
      className="gap-2"
    >
      {enhancing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {enhancing ? "Enhancing..." : "AI Enhance"}
    </Button>
  );
}
