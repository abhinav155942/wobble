import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { X, Moon, Sun } from "lucide-react";
import { AISettings } from "./settings/AISettings";
import { ConnectionSettings } from "./settings/ConnectionSettings";
import { PromptVersionHistory } from "./PromptVersionHistory";
import { AIEnhanceButton } from "@/components/ui/AIEnhanceButton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

interface Agent {
  id: string;
  name: string;
  system_prompt: string | null;
  settings: any;
}

interface AgentSettingsProps {
  agent: Agent;
  onClose: () => void;
  onUpdate: () => void;
}

export function AgentSettings({ agent, onClose, onUpdate }: AgentSettingsProps) {
  const [systemPrompt, setSystemPrompt] = useState(agent.system_prompt || "");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check current theme
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const handleThemeToggle = (checked: boolean) => {
    setIsDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Save current version to history before updating
    if (agent.system_prompt) {
      await supabase.from("prompt_versions").insert({
        agent_id: agent.id,
        system_prompt: agent.system_prompt,
        description: "Previous version",
        created_by: user.id,
      });
    }

    const { error } = await supabase
      .from("agents")
      .update({
        system_prompt: systemPrompt,
      })
      .eq("id", agent.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update agent settings",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Agent settings updated successfully",
    });

    onUpdate();
  };

  const handleRestorePrompt = (restoredPrompt: string) => {
    setSystemPrompt(restoredPrompt);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Agent Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Theme Toggle Section */}
          <div className="space-y-4 p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium flex items-center gap-2">
                  {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  Appearance
                </Label>
                <p className="text-sm text-muted-foreground">
                  Switch between light and dark mode
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {isDarkMode ? 'Dark' : 'Light'}
                </span>
                <Switch
                  checked={isDarkMode}
                  onCheckedChange={handleThemeToggle}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="system-prompt" className="flex items-center gap-2">
                  System Prompt
                  <AIEnhanceButton
                    value={systemPrompt}
                    onEnhanced={setSystemPrompt}
                    type="system_prompt"
                  />
                </Label>
                <PromptVersionHistory
                  agentId={agent.id}
                  onRestore={handleRestorePrompt}
                />
              </div>
              <Textarea
                id="system-prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter system prompt..."
                className="min-h-[200px]"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">AI Configuration</h3>
              <AISettings agent={agent} onUpdate={onUpdate} />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Channel Connections</h3>
              <ConnectionSettings agent={agent} onUpdate={onUpdate} />
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <Button onClick={handleSave} className="w-full">
          Save Changes
        </Button>
      </div>
    </div>
  );
}
