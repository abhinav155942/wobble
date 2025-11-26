import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { History, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PromptVersion {
  id: string;
  system_prompt: string;
  description: string | null;
  created_at: string;
}

interface PromptVersionHistoryProps {
  agentId: string;
  onRestore: (systemPrompt: string) => void;
}

export function PromptVersionHistory({
  agentId,
  onRestore,
}: PromptVersionHistoryProps) {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchVersions();
    }
  }, [agentId, open]);

  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from("prompt_versions")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching prompt versions:", error);
      return;
    }

    setVersions(data || []);
  };

  const handleRestore = (version: PromptVersion) => {
    onRestore(version.system_prompt);
    setOpen(false);
    toast({
      title: "Success",
      description: "Prompt restored from history",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="mr-2 h-4 w-4" />
          Version History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Prompt Version History</DialogTitle>
          <DialogDescription>
            View and restore previous versions of your system prompt
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No previous versions found
              </p>
            ) : (
              versions.map((version, index) => (
                <Card key={version.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          Version {versions.length - index}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(version.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {version.description && (
                        <p className="text-sm text-muted-foreground">
                          {version.description}
                        </p>
                      )}
                      <div className="mt-2 p-3 bg-muted rounded-lg">
                        <p className="text-sm whitespace-pre-wrap font-mono">
                          {version.system_prompt}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(version)}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restore
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
