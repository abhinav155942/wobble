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

export function ThinkingIndicator({ steps, isActive, elapsedTime = 0 }: ThinkingIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (steps.length === 0 && !isActive) return null;

  const currentStep = steps[steps.length - 1];
  const completedSteps = steps.filter(s => s.status === "complete").length;
  const totalSteps = steps.length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "thinking":
        return <Brain className="h-3.5 w-3.5 animate-pulse text-purple-500" />;
      case "tool":
        return <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />;
      case "complete":
        return <span className="text-green-500">✓</span>;
      case "error":
        return <span className="text-red-500">✗</span>;
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
      <div className="mb-3 rounded-xl border border-border/50 bg-muted/30 backdrop-blur-sm overflow-hidden">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-3 py-2.5 h-auto hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 text-left">
              {isActive ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : (
                <Brain className="h-3.5 w-3.5 text-primary" />
              )}
              <span className="text-xs font-medium text-foreground">{getStatusText()}</span>
              {totalSteps > 0 && (
                <span className="text-[10px] text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded-md">
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
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border/30 px-3 py-2 space-y-1.5 bg-background/20">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex items-start gap-2 text-xs animate-fade-in py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors"
              >
                <div className="mt-0.5 flex-shrink-0">{getStatusIcon(step.status)}</div>
                <span
                  className={
                    step.status === "error"
                      ? "text-destructive text-xs"
                      : step.status === "complete"
                      ? "text-muted-foreground text-xs"
                      : "text-foreground text-xs"
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
