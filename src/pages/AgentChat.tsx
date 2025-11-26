import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, Menu, BarChart3, BookOpen } from "lucide-react";
import { ChatInterface } from "@/components/agent/ChatInterface";
import { AgentSettings } from "@/components/agent/AgentSettings";
import { ConversationSidebar } from "@/components/agent/ConversationSidebar";
import { AgentAnalytics } from "@/components/agent/AgentAnalytics";
import { KnowledgeBase } from "@/components/agent/KnowledgeBase";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ModelSelector } from "@/components/agent/ModelSelector";

interface Agent {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string | null;
  settings: any;
}

const AgentChat = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'settings' | 'analytics' | 'knowledge'>('chat');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("wopple-free");

  useEffect(() => {
    fetchAgent();
  }, [agentId]);

  const fetchAgent = async () => {
    if (!agentId) return;

    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (error) {
      console.error("Error fetching agent:", error);
      navigate("/dashboard");
      return;
    }

    setAgent(data);
    
    // Set selected model based on agent settings
    const settings = data.settings as any;
    const aiProvider = settings?.ai?.provider || "wopple";
    if (aiProvider === "custom") {
      const customModel = settings?.ai?.customModel || "gpt-5-2025-08-07";
      const customProvider = settings?.ai?.customProvider || "openai";
      setSelectedModel(`${customProvider}-${customModel}`);
    } else {
      setSelectedModel("wopple-free");
    }
    
    setLoading(false);
  };
  
  const getAvailableModels = () => {
    const models = [
      { id: "wopple-free", name: "Wopple AI", provider: "Free (Limited)", isFree: true }
    ];
    
    if (agent) {
      const settings = agent.settings as any;
      if (settings?.ai?.provider === "custom") {
        const customProvider = settings.ai.customProvider || "openai";
        
        if (customProvider === "openai") {
          models.push(
            { id: "openai-gpt-5-2025-08-07", name: "GPT-5", provider: "OpenAI", isFree: false },
            { id: "openai-gpt-5-mini-2025-08-07", name: "GPT-5 Mini", provider: "OpenAI", isFree: false },
            { id: "openai-gpt-5-nano-2025-08-07", name: "GPT-5 Nano", provider: "OpenAI", isFree: false },
            { id: "openai-gpt-4o", name: "GPT-4o", provider: "OpenAI", isFree: false },
            { id: "openai-gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", isFree: false }
          );
        } else if (customProvider === "anthropic") {
          models.push(
            { id: "anthropic-claude-sonnet-4-5", name: "Claude Sonnet 4.5", provider: "Anthropic", isFree: false },
            { id: "anthropic-claude-opus-4-1-20250805", name: "Claude Opus 4.1", provider: "Anthropic", isFree: false },
            { id: "anthropic-claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "Anthropic", isFree: false },
            { id: "anthropic-claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet", provider: "Anthropic", isFree: false },
            { id: "anthropic-claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", provider: "Anthropic", isFree: false }
          );
        } else if (customProvider === "google") {
          models.push(
            { id: "google-gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", isFree: false },
            { id: "google-gemini-3-pro-preview", name: "Gemini 3 Pro Preview", provider: "Google", isFree: false },
            { id: "google-gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", isFree: false },
            { id: "google-gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", provider: "Google", isFree: false }
          );
        }
      }
    }
    
    return models;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!agent) {
    return null;
  }

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setSidebarOpen(false);
  };

  const handleConversationSelect = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          {agent && (
            <ConversationSidebar
              agentId={agent.id}
              currentConversationId={currentConversationId}
              onConversationSelect={handleConversationSelect}
              onNewChat={handleNewChat}
            />
          )}
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b bg-background/95 backdrop-blur-sm">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/dashboard")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold">{agent.name}</h1>
                  {agent.description && (
                    <p className="text-xs text-muted-foreground">
                      {agent.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ModelSelector
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  availableModels={getAvailableModels()}
                />
                <Button
                  variant={activeTab === 'knowledge' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setActiveTab(activeTab === 'knowledge' ? 'chat' : 'knowledge')}
                >
                  <BookOpen className="h-5 w-5" />
                </Button>
                <Button
                  variant={activeTab === 'analytics' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setActiveTab(activeTab === 'analytics' ? 'chat' : 'analytics')}
                >
                  <BarChart3 className="h-5 w-5" />
                </Button>
                <Button
                  variant={activeTab === 'settings' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setActiveTab(activeTab === 'settings' ? 'chat' : 'settings')}
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'settings' ? (
            <AgentSettings
              agent={agent}
              onClose={() => setActiveTab('chat')}
              onUpdate={fetchAgent}
            />
          ) : activeTab === 'analytics' ? (
            <div className="h-full overflow-y-auto">
              <AgentAnalytics agent={agent} />
            </div>
          ) : activeTab === 'knowledge' ? (
            <div className="h-full overflow-y-auto">
              {agent && <KnowledgeBase agent={agent} />}
            </div>
          ) : (
            <ChatInterface
              agent={agent}
              conversationId={currentConversationId}
              onConversationChange={setCurrentConversationId}
              selectedModel={selectedModel}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentChat;
