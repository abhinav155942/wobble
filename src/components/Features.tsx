import { Brain, MessageSquare, Zap, ShoppingCart, BarChart3, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import multichannelImage from "@/assets/features-multichannel.png";

const Features = () => {
  return <section id="features" className="py-12 md:py-20 px-2 sm:px-4 md:px-6 bg-gradient-to-b from-background via-muted/20 to-background relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>
      
      <div className="container mx-auto relative px-0 sm:px-4">
        <div className="text-center space-y-3 md:space-y-4 mb-12 md:mb-20 px-2 sm:px-4">
          <div className="inline-block">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary px-4 py-1.5 text-xs md:text-sm font-semibold">
              ENTERPRISE-GRADE PLATFORM
            </Badge>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold text-foreground leading-tight">
            Built for Scale,<br />Designed for Performance
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            A complete AI infrastructure that handles millions of conversations while maintaining sub-second response times
          </p>
        </div>

        {/* Premium feature showcase - Split layout */}
        <div className="space-y-16 md:space-y-28 px-2 sm:px-4">
          {/* Feature 1: Smart RAG Engine */}
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-20 items-center">
            <div className="space-y-5 md:space-y-8" data-aos="fade-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                <Brain className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-primary">INTELLIGENT CORE</span>
              </div>
              <h3 className="text-2xl sm:text-3xl md:text-5xl font-bold text-foreground leading-tight">
                Neural Knowledge<br />Processing
              </h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Advanced RAG architecture that learns from 100k+ tokens, auto-syncs every 24 hours, and provides source citations with every response.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 bg-card/50 backdrop-blur border border-border/50 rounded-xl hover:border-primary/30 transition-all">
                  <div className="text-3xl sm:text-4xl font-bold text-primary mb-1">95%+</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Answer Accuracy</div>
                </div>
                <div className="p-4 sm:p-5 bg-card/50 backdrop-blur border border-border/50 rounded-xl hover:border-primary/30 transition-all">
                  <div className="text-3xl sm:text-4xl font-bold text-primary mb-1">&lt;2s</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Response Time</div>
                </div>
              </div>
            </div>
            <div className="relative group" data-aos="fade-left">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 rounded-2xl sm:rounded-3xl blur-3xl group-hover:blur-[100px] transition-all duration-700" />
              <div className="relative p-6 sm:p-8 md:p-12 bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-xl border-2 border-border/30 rounded-2xl sm:rounded-3xl shadow-2xl">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg">
                      <Brain className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Knowledge Base Status</div>
                      <div className="text-xl font-bold text-foreground">Active & Learning</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Processing Capacity</span>
                      <span className="font-semibold text-foreground">87%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full w-[87%] bg-gradient-to-r from-primary to-accent rounded-full" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">10k+</div>
                      <div className="text-xs text-muted-foreground">Embeddings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">24h</div>
                      <div className="text-xs text-muted-foreground">Auto-Sync</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">∞</div>
                      <div className="text-xs text-muted-foreground">Scale</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Feature 2: Multi-Channel & Actions */}
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-20 items-center">
            <div className="lg:order-2 space-y-5 md:space-y-8" data-aos="fade-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full">
                <Zap className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-primary">OMNICHANNEL</span>
              </div>
              <h3 className="text-2xl sm:text-3xl md:text-5xl font-bold text-foreground leading-tight">
                One Agent,<br />Every Channel
              </h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Deploy across web chat, WhatsApp, Instagram DM, and email. Execute actions like refunds, returns, and order tracking automatically.
              </p>
              <div className="space-y-4">
                {[
                  { icon: MessageSquare, label: "Web Chat Widget", status: "Active" },
                  { icon: ShoppingCart, label: "Ecommerce Actions", status: "Integrated" },
                  { icon: BarChart3, label: "Analytics Dashboard", status: "Real-time" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-card/50 backdrop-blur border border-border/50 rounded-xl hover:border-primary/30 hover:-translate-x-2 transition-all group">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">{item.label}</div>
                      <div className="text-sm text-muted-foreground">{item.status}</div>
                    </div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:order-1 relative group" data-aos="fade-right">
              <div className="absolute inset-0 bg-gradient-to-bl from-accent/20 via-primary/10 to-accent/20 rounded-2xl sm:rounded-3xl blur-3xl group-hover:blur-[100px] transition-all duration-700" />
              <img 
                src={multichannelImage} 
                alt="Multiple communication channels" 
                className="relative rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-border/30 hover:border-primary/30 transition-all duration-500 w-full" 
              />
            </div>
          </div>

          {/* Feature 3: Enterprise Security */}
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-20 items-center">
            <div className="space-y-5 md:space-y-8" data-aos="fade-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                <Shield className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-primary">ENTERPRISE READY</span>
              </div>
              <h3 className="text-2xl sm:text-3xl md:text-5xl font-bold text-foreground leading-tight">
                Security &<br />Compliance Built-In
              </h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Role-based access control, comprehensive audit logs, and SOC 2 compliance ensure your data stays protected at enterprise scale.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                {[
                  { icon: Shield, title: "SOC 2 Type II", desc: "Certified" },
                  { icon: BarChart3, title: "Audit Logs", desc: "Complete History" },
                  { icon: MessageSquare, title: "RBAC", desc: "Granular Control" },
                  { icon: Zap, title: "99.9% Uptime", desc: "SLA Guaranteed" },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 sm:p-5 md:p-6 bg-gradient-to-br from-card/90 to-card/50 backdrop-blur border-2 border-border/30 rounded-xl sm:rounded-2xl hover:border-primary/30 hover:-translate-y-2 transition-all group">
                    <item.icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary mb-2 sm:mb-3 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-sm sm:text-base text-foreground mb-1">{item.title}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative group" data-aos="fade-left">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 rounded-2xl sm:rounded-3xl blur-3xl group-hover:blur-[100px] transition-all duration-700" />
              <img 
                alt="Integration dashboard" 
                className="relative rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-border/30 hover:border-primary/30 transition-all duration-500 w-full" 
                src="/lovable-uploads/37597a97-0bc3-4b69-b25a-eed16a327412.png" 
              />
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default Features;