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

const AI_MODELS = {
  openai: [
    { id: "gpt-5-2025-08-07", name: "GPT-5", description: "Most capable model" },
    { id: "gpt-5-mini-2025-08-07", name: "GPT-5 Mini", description: "Balanced performance" },
    { id: "gpt-5-nano-2025-08-07", name: "GPT-5 Nano", description: "Fast and efficient" },
    { id: "gpt-4o", name: "GPT-4o", description: "Previous generation" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Cost-effective" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", description: "Most intelligent" },
    { id: "claude-opus-4-1-20250805", name: "Claude Opus 4.1", description: "Highly capable" },
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", description: "High performance" },
    { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet", description: "Extended thinking" },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", description: "Fastest model" },
  ],
  google: [
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Top-tier reasoning" },
    { id: "gemini-3-pro-preview", name: "Gemini 3 Pro Preview", description: "Next generation" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Balanced choice" },
    { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", description: "Fastest option" },
  ],
};

export function AISettings({ agent, onUpdate }: { agent: Agent; onUpdate: () => void }) {
  const [aiProvider, setAiProvider] = useState(agent.settings?.ai?.provider || "wopple");
  const [customModel, setCustomModel] = useState(agent.settings?.ai?.customModel || "gpt-5-2025-08-07");
  const [customApiKey, setCustomApiKey] = useState(agent.settings?.ai?.customApiKey || "");
  const [customProvider, setCustomProvider] = useState(agent.settings?.ai?.customProvider || "openai");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleProviderChange = (newProvider: string) => {
    setCustomProvider(newProvider);
    // Auto-select first model for the new provider
    const firstModel = AI_MODELS[newProvider as keyof typeof AI_MODELS][0].id;
    setCustomModel(firstModel);
  };

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
            <Select value={customProvider} onValueChange={handleProviderChange}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select AI provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                <SelectItem value="google">Google AI (Gemini)</SelectItem>
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
                {AI_MODELS[customProvider as keyof typeof AI_MODELS].map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-xs text-muted-foreground">{model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder={`Enter your ${customProvider === 'openai' ? 'OpenAI' : customProvider === 'anthropic' ? 'Anthropic' : 'Google AI'} API key`}
              value={customApiKey}
              onChange={(e) => setCustomApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {customProvider === 'openai' && "Get your API key from platform.openai.com"}
              {customProvider === 'anthropic' && "Get your API key from console.anthropic.com"}
              {customProvider === 'google' && "Get your API key from makersuite.google.com"}
            </p>
          </div>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save AI Settings"}
      </Button>
    </div>
  );
}
