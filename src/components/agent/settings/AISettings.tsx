import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Agent {
  id: string;
  settings: any;
}

export function AISettings({ agent, onUpdate }: { agent: Agent; onUpdate: () => void }) {
  const [aiProvider, setAiProvider] = useState(agent.settings?.ai?.provider || "wopple");
  const [customModel, setCustomModel] = useState(agent.settings?.ai?.customModel || "");
  const [customApiKey, setCustomApiKey] = useState(agent.settings?.ai?.customApiKey || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("agents")
      .update({
        settings: {
          ...agent.settings,
          ai: {
            provider: aiProvider,
            customModel: aiProvider === "custom" ? customModel : null,
            customApiKey: aiProvider === "custom" ? customApiKey : null,
          },
        },
      })
      .eq("id", agent.id);

    if (error) {
      toast({
        title: "Error saving AI settings",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "AI settings saved",
        description: "Your AI configuration has been updated.",
      });
      onUpdate();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>AI Provider</Label>
        <RadioGroup value={aiProvider} onValueChange={setAiProvider}>
          <div className="flex items-center space-x-2 border rounded-lg p-4">
            <RadioGroupItem value="wopple" id="wopple" />
            <div className="flex-1">
              <Label htmlFor="wopple" className="font-medium cursor-pointer">
                Wopple AI <Badge variant="secondary" className="ml-2">Free</Badge>
              </Label>
              <p className="text-xs text-muted-foreground">
                Limited access with 1000 messages/month
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 border rounded-lg p-4">
            <RadioGroupItem value="custom" id="custom" />
            <div className="flex-1">
              <Label htmlFor="custom" className="font-medium cursor-pointer">
                Custom AI Provider
              </Label>
              <p className="text-xs text-muted-foreground">
                Use your own OpenAI, Anthropic, or other AI API
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {aiProvider === "custom" && (
        <div className="space-y-4 border-l-2 border-primary/20 pl-4">
          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select value={customModel} onValueChange={setCustomModel}>
              <SelectTrigger id="model">
                <SelectValue placeholder="Select AI model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai-gpt-4">OpenAI GPT-4</SelectItem>
                <SelectItem value="openai-gpt-3.5">OpenAI GPT-3.5 Turbo</SelectItem>
                <SelectItem value="anthropic-claude-3">Anthropic Claude 3</SelectItem>
                <SelectItem value="anthropic-claude-2">Anthropic Claude 2</SelectItem>
                <SelectItem value="gemini-pro">Google Gemini Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your API key"
              value={customApiKey}
              onChange={(e) => setCustomApiKey(e.target.value)}
            />
          </div>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save AI Settings"}
      </Button>
    </div>
  );
}
