import { Sparkles, MessageSquare, Zap, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AgentShowcase() {
  return (
    <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="container mx-auto relative">
        <div className="text-center space-y-4 mb-16">
          <Badge variant="outline" className="border-primary/30 text-primary">
            INTELLIGENT AGENTS
          </Badge>
          <h2 className="text-4xl md:text-6xl font-bold text-foreground">
            Your AI Support Agent
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Create custom AI agents that understand your business, handle complex queries, 
            and work across all your channels seamlessly
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="group p-8 bg-gradient-to-br from-card to-card/50 border-2 border-border/30 rounded-3xl hover:border-primary/50 transition-all hover:-translate-y-2 shadow-xl hover:shadow-2xl">
            <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Smart Learning</h3>
            <p className="text-muted-foreground mb-4">
              Agents learn from your knowledge base, previous conversations, and customer interactions
            </p>
            <ul className="space-y-2">
              {["Auto-sync knowledge", "Context awareness", "Memory recall"].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="group p-8 bg-gradient-to-br from-card to-card/50 border-2 border-border/30 rounded-3xl hover:border-primary/50 transition-all hover:-translate-y-2 shadow-xl hover:shadow-2xl">
            <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Multi-Channel</h3>
            <p className="text-muted-foreground mb-4">
              Deploy everywhere your customers are - web, WhatsApp, Instagram, email, and more
            </p>
            <ul className="space-y-2">
              {["Unified inbox", "Instant responses", "24/7 availability"].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="group p-8 bg-gradient-to-br from-card to-card/50 border-2 border-border/30 rounded-3xl hover:border-primary/50 transition-all hover:-translate-y-2 shadow-xl hover:shadow-2xl">
            <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Action Capable</h3>
            <p className="text-muted-foreground mb-4">
              Not just chat - agents can take actions like processing refunds, updating orders, and more
            </p>
            <ul className="space-y-2">
              {["Process refunds", "Update orders", "Access systems"].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 p-8 bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary/20 rounded-3xl max-w-4xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Choose Your AI Model</h3>
              <p className="text-muted-foreground mb-4">
                Start with Wopple AI (free, limited) or connect your own OpenAI, Anthropic, or Google AI account for unlimited access
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Wopple AI Free</Badge>
                <Badge variant="outline">OpenAI GPT-5</Badge>
                <Badge variant="outline">Anthropic Claude</Badge>
                <Badge variant="outline">Google Gemini</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
