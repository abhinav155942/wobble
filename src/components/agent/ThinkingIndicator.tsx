import { useState } from "react";
import { Brain, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ThinkingStep {
  id: string;
  status: "thinking" | "tool" | "complete" | "error";
  content: string;
  toolName?: string;
  timestamp: number;
}

interface ThinkingIndicatorProps {
  steps: ThinkingStep[];
  isActive: boolean;
  elapsedTime?: number;
}

export function ThinkingIndicator({ steps, isActive, elapsedTime = 0, compact = false }: ThinkingIndicatorProps & { compact?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  if (steps.length === 0 && !isActive) return null;

  const currentStep = steps[steps.length - 1];
  const completedSteps = steps.filter(s => s.status === "complete").length;
  const totalSteps = steps.length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "thinking":
        return <Brain className="h-3 w-3 animate-pulse text-purple-500" />;
      case "tool":
        return <Loader2 className="h-3 w-3 animate-spin text-amber-500" />;
      case "complete":
        return <span className="text-green-500 text-xs">✓</span>;
      case "error":
        return <span className="text-red-500 text-xs">✗</span>;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    if (!isActive && completedSteps === totalSteps) {
      return "Complete";
    }
    if (currentStep?.status === "thinking") {
      return "Thinking...";
    }
    if (currentStep?.status === "tool") {
      return currentStep.toolName ? `Using ${currentStep.toolName}...` : "Processing...";
    }
    return "Working...";
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={`${compact ? 'mb-2' : 'mb-3'} rounded-lg border border-border/30 bg-muted/20 backdrop-blur-sm overflow-hidden`}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-2.5 py-1.5 h-auto hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-1.5 flex-1 text-left">
              {isActive ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : (
                <Brain className="h-3 w-3 text-primary" />
              )}
              <span className="text-[11px] font-medium text-foreground">{getStatusText()}</span>
              {totalSteps > 0 && (
                <span className="text-[10px] text-muted-foreground bg-background/50 px-1 py-0.5 rounded">
                  {completedSteps}/{totalSteps}
                </span>
              )}
              {elapsedTime > 0 && (
                <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                  {(elapsedTime / 1000).toFixed(1)}s
                </span>
              )}
            </div>
            {isOpen ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground transition-transform" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border/20 px-2.5 py-1.5 space-y-1 bg-background/10">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex items-start gap-1.5 text-xs animate-fade-in py-1 px-1.5 rounded hover:bg-muted/20 transition-colors"
              >
                <div className="mt-0.5 flex-shrink-0">{getStatusIcon(step.status)}</div>
                <span
                  className={
                    step.status === "error"
                      ? "text-destructive text-[11px]"
                      : step.status === "complete"
                      ? "text-muted-foreground text-[11px]"
                      : "text-foreground text-[11px]"
                  }
                >
                  {step.content}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
