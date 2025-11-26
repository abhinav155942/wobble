import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Search, Code, FileText, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ToolExecution {
  name: string;
  status: "pending" | "success" | "error";
  parameters?: Record<string, any>;
  result?: any;
  duration?: number;
}

interface ToolExecutionCardProps {
  execution: ToolExecution;
}

const toolIcons: Record<string, any> = {
  search: Search,
  code: Code,
  file: FileText,
  database: Database,
};

export function ToolExecutionCard({ execution }: ToolExecutionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = toolIcons[execution.name.toLowerCase()] || Code;

  const getStatusIcon = () => {
    switch (execution.status) {
      case "pending":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <div className="my-3 rounded-xl border-2 border-teal-500/20 bg-teal-500/5 overflow-hidden transition-all hover:border-teal-500/40">
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between p-4 h-auto hover:bg-teal-500/10"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/10">
            <Icon className="h-4 w-4 text-teal-500" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">{execution.name}</span>
            {execution.duration && (
              <span className="text-xs text-muted-foreground">
                {execution.duration}ms
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </Button>

      {isExpanded && (
        <div className="border-t border-teal-500/20 bg-background/50 p-4 space-y-3 animate-in slide-in-from-top-2">
          {execution.parameters && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Parameters
              </p>
              <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto border border-border">
                {JSON.stringify(execution.parameters, null, 2)}
              </pre>
            </div>
          )}
          {execution.result && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Result
              </p>
              <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto border border-border">
                {JSON.stringify(execution.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
