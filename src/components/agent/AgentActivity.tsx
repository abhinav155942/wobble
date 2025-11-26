import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight, Check, Loader2, AlertCircle, Search, Brain, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExecutionTrace {
  id: string;
  step_number: number;
  step_type: string;
  step_name: string;
  step_description?: string;
  status: string;
  input_data?: any;
  output_data?: any;
  error_message?: string;
  duration_ms?: number;
  started_at: string;
  completed_at?: string;
}

interface AgentActivityProps {
  conversationId: string | null;
  isLoading?: boolean;
}

const getStepIcon = (stepType: string, status: string) => {
  if (status === "completed") return <Check className="h-4 w-4 text-green-500" />;
  if (status === "error") return <AlertCircle className="h-4 w-4 text-destructive" />;
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  
  switch (stepType) {
    case "reasoning":
      return <Brain className="h-4 w-4 text-muted-foreground" />;
    case "tool":
      return <Wrench className="h-4 w-4 text-muted-foreground" />;
    case "response":
      return <Search className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Loader2 className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusText = (stepType: string, status: string) => {
  if (status === "completed") return "Completed";
  if (status === "error") return "Failed";
  if (status === "running") {
    switch (stepType) {
      case "reasoning":
        return "Thinking...";
      case "tool":
        return "Executing tool";
      case "response":
        return "Generating response";
      default:
        return "Processing...";
    }
  }
  return "Pending";
};

export function AgentActivity({ conversationId, isLoading }: AgentActivityProps) {
  const [traces, setTraces] = useState<ExecutionTrace[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!conversationId) {
      console.log('[AgentActivity] No conversationId provided');
      return;
    }

    console.log('[AgentActivity] Loading traces for conversation:', conversationId);

    // Load existing traces
    const loadTraces = async () => {
      const { data, error } = await supabase
        .from('execution_traces')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('step_number', { ascending: true });

      if (error) {
        console.error('[AgentActivity] Error loading traces:', error);
        return;
      }

      console.log('[AgentActivity] Loaded traces:', data?.length || 0);
      setTraces(data || []);
    };

    loadTraces();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`execution_traces:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'execution_traces',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('[AgentActivity] Real-time event:', payload.eventType);
          if (payload.eventType === 'INSERT') {
            setTraces((prev) => [...prev, payload.new as ExecutionTrace]);
          } else if (payload.eventType === 'UPDATE') {
            setTraces((prev) =>
              prev.map((t) =>
                t.id === payload.new.id ? (payload.new as ExecutionTrace) : t
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[AgentActivity] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  if (!conversationId && !isLoading) {
    return (
      <Card className="p-6 border-border bg-card">
        <div className="text-center text-muted-foreground">
          <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Start a conversation to see agent activity</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Agent Activity
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Real-time execution trace • {traces.length} step{traces.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      <ScrollArea className="h-[600px]">
        <div className="p-4 space-y-2">
          {traces.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Waiting for agent activity...</p>
              <p className="text-xs mt-1">Execution steps will appear here as the agent works</p>
            </div>
          )}

          {traces.map((trace) => (
            <Collapsible
              key={trace.id}
              open={expandedSteps.has(trace.id)}
              onOpenChange={() => toggleStep(trace.id)}
            >
              <div className="rounded-lg border border-border bg-background/50 hover:bg-background transition-colors">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-3 h-auto font-normal"
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <div className="flex-shrink-0">
                        {getStepIcon(trace.step_type, trace.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            Step {trace.step_number}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {trace.step_type}
                          </Badge>
                        </div>
                        <div className="font-medium truncate mt-0.5">
                          {trace.step_name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {getStatusText(trace.step_type, trace.status)}
                        </div>
                      </div>

                      {expandedSteps.has(trace.id) ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                      )}
                    </div>
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-3 pb-3 space-y-3 text-sm">
                    {trace.step_description && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          Description
                        </span>
                        <p className="text-sm mt-1">{trace.step_description}</p>
                      </div>
                    )}

                    {trace.input_data && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          Input
                        </span>
                        <pre className="text-xs mt-1 p-2 rounded bg-muted overflow-x-auto">
                          {JSON.stringify(trace.input_data, null, 2)}
                        </pre>
                      </div>
                    )}

                    {trace.output_data && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          Output
                        </span>
                        <pre className="text-xs mt-1 p-2 rounded bg-muted overflow-x-auto">
                          {JSON.stringify(trace.output_data, null, 2)}
                        </pre>
                      </div>
                    )}

                    {trace.error_message && (
                      <div>
                        <span className="text-xs font-medium text-destructive">
                          Error
                        </span>
                        <p className="text-sm mt-1 text-destructive">{trace.error_message}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                      <span>Started: {new Date(trace.started_at).toLocaleTimeString()}</span>
                      {trace.completed_at && (
                        <span>Completed: {new Date(trace.completed_at).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Agent is processing...
              </span>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
