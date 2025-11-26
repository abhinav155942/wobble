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
  const [customModel, setCustomModel] = useState(agent.settings?.ai?.customModel || "gpt-5-2025-08-07");
  const [customApiKey, setCustomApiKey] = useState(agent.settings?.ai?.customApiKey || "");
  const [customProvider, setCustomProvider] = useState(agent.settings?.ai?.customProvider || "openai");
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
            customProvider: aiProvider === "custom" ? customProvider : null,
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
            <Label htmlFor="provider">AI Provider</Label>
            <Select value={customProvider} onValueChange={setCustomProvider}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select AI provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google AI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select value={customModel} onValueChange={setCustomModel}>
              <SelectTrigger id="model">
                <SelectValue placeholder="Select AI model" />
              </SelectTrigger>
              <SelectContent>
                {customProvider === "openai" && (
                  <>
                    <SelectItem value="gpt-5-2025-08-07">GPT-5 (Recommended)</SelectItem>
                    <SelectItem value="gpt-5-mini-2025-08-07">GPT-5 Mini</SelectItem>
                    <SelectItem value="gpt-5-nano-2025-08-07">GPT-5 Nano</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  </>
                )}
                {customProvider === "anthropic" && (
                  <>
                    <SelectItem value="claude-sonnet-4-5">Claude Sonnet 4.5</SelectItem>
                    <SelectItem value="claude-opus-4-1-20250805">Claude Opus 4.1</SelectItem>
                    <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</SelectItem>
                  </>
                )}
                {customProvider === "google" && (
                  <>
                    <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                    <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                  </>
                )}
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
