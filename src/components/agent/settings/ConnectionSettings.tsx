import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Youtube, Send, Instagram, Mail, Globe, MessageCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Agent {
  id: string;
  settings: any;
}

const CONNECTION_CONFIGS = {
  youtube: {
    fields: [
      { key: "apiKey", label: "YouTube API Key", type: "password", placeholder: "Enter YouTube API Key" }
    ],
    useCases: [
      { key: "analyzePerformance", label: "Analyze channel performance" },
      { key: "autoModerate", label: "Auto-moderate comments" },
      { key: "autoReply", label: "Auto-reply to comments" },
      { key: "generateMetadata", label: "Auto-generate video metadata" },
      { key: "detectSpam", label: "Detect and remove spam" }
    ]
  },
  telegram: {
    fields: [
      { key: "botToken", label: "Bot Father Token", type: "password", placeholder: "Enter Bot Token from @BotFather" }
    ],
    useCases: [
      { key: "autoReply", label: "Auto-reply to messages" },
      { key: "groupModeration", label: "Auto-moderate groups" },
      { key: "scheduledMessages", label: "Send scheduled messages" },
      { key: "customCommands", label: "Execute custom commands" },
      { key: "faqSupport", label: "Answer FAQs automatically" }
    ]
  },
  instagram: {
    fields: [
      { key: "apiKey", label: "Instagram Graph API Key", type: "password", placeholder: "Enter Instagram API Key" }
    ],
    useCases: [
      { key: "autoReplyDMs", label: "Auto-reply to DMs" },
      { key: "autoReplyComments", label: "Auto-reply to comments" },
      { key: "keywordTriggers", label: "Keyword-triggered responses" },
      { key: "leadQualification", label: "Lead qualification" },
      { key: "contentSuggestions", label: "Suggest content ideas" }
    ]
  },
  whatsapp: {
    fields: [
      { key: "businessApiKey", label: "WhatsApp Business API Key", type: "password", placeholder: "Enter Business API Key" },
      { key: "phoneNumberId", label: "Phone Number ID", type: "text", placeholder: "Enter Phone Number ID" }
    ],
    useCases: [
      { key: "supportAgent", label: "24/7 automated support" },
      { key: "orderTracking", label: "Order tracking & updates" },
      { key: "appointmentBooking", label: "Appointment booking" },
      { key: "productRecommendations", label: "Product recommendations" },
      { key: "catalogBrowsing", label: "Catalog browsing" },
      { key: "paymentReminders", label: "Payment reminders" }
    ]
  },
  email: {
    fields: [
      { key: "smtpHost", label: "SMTP Host", type: "text", placeholder: "smtp.gmail.com" },
      { key: "smtpPort", label: "SMTP Port", type: "number", placeholder: "587" },
      { key: "smtpUsername", label: "Email Address", type: "email", placeholder: "your@email.com" },
      { key: "smtpPassword", label: "Email Password", type: "password", placeholder: "Enter email password" }
    ],
    useCases: [
      { key: "autoReply", label: "Auto-reply to emails" },
      { key: "categorize", label: "Categorize incoming emails" },
      { key: "draftResponses", label: "Draft responses" },
      { key: "outboundCampaigns", label: "Send outbound campaigns" },
      { key: "extractData", label: "Extract data to CRM" }
    ]
  },
  web_search: {
    fields: [],
    useCases: [
      { key: "instantAnswers", label: "Instant query answering" },
      { key: "productSearch", label: "Product search assistance" }
    ]
  }
};

const CONNECTION_TYPES = [
  { id: "youtube", name: "YouTube", icon: Youtube, description: "Upload videos, analyze performance, moderate comments" },
  { id: "telegram", name: "Telegram", icon: Send, description: "Run chatbots, auto-moderate, handle commands via Bot API" },
  { id: "instagram", name: "Instagram", icon: Instagram, description: "Auto-reply DMs, manage comments, analyze content" },
  { id: "whatsapp", name: "WhatsApp", icon: MessageCircle, description: "24/7 support, order tracking, automated checkout" },
  { id: "email", name: "Email", icon: Mail, description: "Auto-reply, categorize, draft responses via SMTP" },
  { id: "web_search", name: "Web Search", icon: Globe, description: "Search the web for real-time information" },
];

export function ConnectionSettings({ agent, onUpdate }: { agent: Agent; onUpdate: () => void }) {
  const [connections, setConnections] = useState(agent.settings?.connections || {});
  const [saving, setSaving] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testingInstagram, setTestingInstagram] = useState(false);
  const [instagramStatus, setInstagramStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const toggleConnection = (id: string) => {
    setConnections({
      ...connections,
      [id]: {
        ...connections[id],
        enabled: !connections[id]?.enabled,
      },
    });
  };

  const updateConnectionField = (id: string, fieldKey: string, value: string) => {
    setConnections({
      ...connections,
      [id]: {
        ...connections[id],
        [fieldKey]: value,
        enabled: connections[id]?.enabled || false,
      },
    });
  };

  const toggleUseCase = (id: string, useCaseKey: string) => {
    setConnections({
      ...connections,
      [id]: {
        ...connections[id],
        useCases: {
          ...connections[id]?.useCases,
          [useCaseKey]: !connections[id]?.useCases?.[useCaseKey]
        }
      },
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("agents")
      .update({
        settings: {
          ...agent.settings,
          connections,
        },
      })
      .eq("id", agent.id);

    if (error) {
      toast({
        title: "Error saving connections",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Connections saved",
        description: "Your connection settings have been updated.",
      });
      onUpdate();
    }
    setSaving(false);
  };

  const handleTestTelegram = async () => {
    const botToken = connections.telegram?.botToken;
    
    if (!botToken) {
      toast({
        title: "Bot token required",
        description: "Please enter your Telegram Bot token first",
        variant: "destructive",
      });
      return;
    }

    setTestingTelegram(true);
    setTelegramStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('register-telegram-webhook', {
        body: { botToken, agentId: agent.id }
      });

      if (error) throw error;

      if (data.success) {
        setTelegramStatus('success');
        toast({
          title: "Telegram connected!",
          description: `Bot @${data.botInfo.username} is now connected and listening for messages.`,
        });
      } else {
        setTelegramStatus('error');
        toast({
          title: "Connection failed",
          description: data.error || "Failed to connect to Telegram",
          variant: "destructive",
        });
      }
    } catch (error) {
      setTelegramStatus('error');
      toast({
        title: "Connection error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleTestWhatsApp = async () => {
    const { businessApiKey, phoneNumberId } = connections.whatsapp || {};
    
    if (!businessApiKey || !phoneNumberId) {
      toast({
        title: "Configuration required",
        description: "Please enter WhatsApp Business API Key and Phone Number ID",
        variant: "destructive",
      });
      return;
    }

    setTestingWhatsApp(true);
    setWhatsappStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('register-whatsapp-webhook', {
        body: { businessApiKey, phoneNumberId }
      });

      if (error) throw error;

      if (data.success) {
        setWhatsappStatus('success');
        toast({
          title: "WhatsApp connected!",
          description: `Phone ${data.phoneInfo.display_phone_number} is now connected.`,
        });
      } else {
        setWhatsappStatus('error');
        toast({
          title: "Connection failed",
          description: data.error || "Failed to connect to WhatsApp",
          variant: "destructive",
        });
      }
    } catch (error) {
      setWhatsappStatus('error');
      toast({
        title: "Connection error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setTestingWhatsApp(false);
    }
  };

  const handleTestInstagram = async () => {
    const { apiKey } = connections.instagram || {};
    
    if (!apiKey) {
      toast({
        title: "API key required",
        description: "Please enter your Instagram Graph API key",
        variant: "destructive",
      });
      return;
    }

    setTestingInstagram(true);
    setInstagramStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('register-instagram-webhook', {
        body: { apiKey }
      });

      if (error) throw error;

      if (data.success) {
        setInstagramStatus('success');
        toast({
          title: "Instagram verified!",
          description: data.note,
        });
      } else {
        setInstagramStatus('error');
        toast({
          title: "Verification failed",
          description: data.error || "Failed to verify Instagram token",
          variant: "destructive",
        });
      }
    } catch (error) {
      setInstagramStatus('error');
      toast({
        title: "Connection error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setTestingInstagram(false);
    }
  };

  const handleTestEmail = async () => {
    const { smtpHost, smtpPort, smtpUsername, smtpPassword } = connections.email || {};
    
    if (!smtpHost || !smtpPort || !smtpUsername || !smtpPassword) {
      toast({
        title: "Configuration required",
        description: "Please fill in all SMTP configuration fields",
        variant: "destructive",
      });
      return;
    }

    setTestingEmail(true);
    setEmailStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('test-email-smtp', {
        body: { smtpHost, smtpPort, smtpUsername, smtpPassword }
      });

      if (error) throw error;

      if (data.success) {
        setEmailStatus('success');
        toast({
          title: "Email connected!",
          description: data.message,
        });
      } else {
        setEmailStatus('error');
        toast({
          title: "Connection failed",
          description: data.error || "Failed to connect to SMTP server",
          variant: "destructive",
        });
      }
    } catch (error) {
      setEmailStatus('error');
      toast({
        title: "Connection error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {CONNECTION_TYPES.map((conn) => {
        const Icon = conn.icon;
        const isEnabled = connections[conn.id]?.enabled || false;
        const config = CONNECTION_CONFIGS[conn.id as keyof typeof CONNECTION_CONFIGS];
        
        return (
          <Card key={conn.id} className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{conn.name}</p>
                  <p className="text-xs text-muted-foreground">{conn.description}</p>
                </div>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={() => toggleConnection(conn.id)}
              />
            </div>
            
            {isEnabled && (
              <div className="ml-8 space-y-4">
                {/* Configuration Fields */}
                {config.fields.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Configuration</h4>
                    {config.fields.map((field) => (
                      <div key={field.key} className="space-y-2">
                        <Label htmlFor={`${conn.id}-${field.key}`}>{field.label}</Label>
                        <Input
                          id={`${conn.id}-${field.key}`}
                          type={field.type}
                          placeholder={field.placeholder}
                          value={connections[conn.id]?.[field.key] || ""}
                          onChange={(e) => updateConnectionField(conn.id, field.key, e.target.value)}
                        />
                      </div>
                    ))}
                    
                    {/* Test Connection Buttons */}
                    {conn.id === "telegram" && connections.telegram?.botToken && (
                      <Button
                        onClick={handleTestTelegram}
                        disabled={testingTelegram}
                        variant={telegramStatus === 'success' ? 'default' : telegramStatus === 'error' ? 'destructive' : 'outline'}
                        className="w-full"
                      >
                        {testingTelegram ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Testing Connection...
                          </>
                        ) : telegramStatus === 'success' ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Connected Successfully
                          </>
                        ) : telegramStatus === 'error' ? (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Connection Failed
                          </>
                        ) : (
                          'Connect & Test Telegram'
                        )}
                      </Button>
                    )}
                    
                    {conn.id === "whatsapp" && connections.whatsapp?.businessApiKey && connections.whatsapp?.phoneNumberId && (
                      <Button
                        onClick={handleTestWhatsApp}
                        disabled={testingWhatsApp}
                        variant={whatsappStatus === 'success' ? 'default' : whatsappStatus === 'error' ? 'destructive' : 'outline'}
                        className="w-full"
                      >
                        {testingWhatsApp ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Testing Connection...
                          </>
                        ) : whatsappStatus === 'success' ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Connected Successfully
                          </>
                        ) : whatsappStatus === 'error' ? (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Connection Failed
                          </>
                        ) : (
                          'Connect & Test WhatsApp'
                        )}
                      </Button>
                    )}
                    
                    {conn.id === "instagram" && connections.instagram?.apiKey && (
                      <Button
                        onClick={handleTestInstagram}
                        disabled={testingInstagram}
                        variant={instagramStatus === 'success' ? 'default' : instagramStatus === 'error' ? 'destructive' : 'outline'}
                        className="w-full"
                      >
                        {testingInstagram ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Verifying Token...
                          </>
                        ) : instagramStatus === 'success' ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Token Verified
                          </>
                        ) : instagramStatus === 'error' ? (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Verification Failed
                          </>
                        ) : (
                          'Verify Instagram Token'
                        )}
                      </Button>
                    )}
                    
                    {conn.id === "email" && connections.email?.smtpHost && connections.email?.smtpPort && 
                     connections.email?.smtpUsername && connections.email?.smtpPassword && (
                      <Button
                        onClick={handleTestEmail}
                        disabled={testingEmail}
                        variant={emailStatus === 'success' ? 'default' : emailStatus === 'error' ? 'destructive' : 'outline'}
                        className="w-full"
                      >
                        {testingEmail ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending Test Email...
                          </>
                        ) : emailStatus === 'success' ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Email Sent Successfully
                          </>
                        ) : emailStatus === 'error' ? (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Connection Failed
                          </>
                        ) : (
                          'Test SMTP Connection'
                        )}
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Use Case Toggles */}
                {config.useCases.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Enabled Features</h4>
                    <div className="space-y-2">
                      {config.useCases.map((useCase) => (
                        <div key={useCase.key} className="flex items-center justify-between">
                          <Label htmlFor={`${conn.id}-${useCase.key}`} className="text-sm font-normal cursor-pointer">
                            {useCase.label}
                          </Label>
                          <Switch
                            id={`${conn.id}-${useCase.key}`}
                            checked={connections[conn.id]?.useCases?.[useCase.key] || false}
                            onCheckedChange={() => toggleUseCase(conn.id, useCase.key)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {config.fields.length === 0 && (
                  <p className="text-sm text-muted-foreground">No configuration required - ready to use!</p>
                )}
              </div>
            )}
          </Card>
        );
      })}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save Connections"}
      </Button>
    </div>
  );
}
