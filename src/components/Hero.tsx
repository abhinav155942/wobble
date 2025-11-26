import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Quote } from "lucide-react";
import { InteractiveChat } from "./InteractiveChat";

const Hero = () => {
  return (
    <section className="pt-32 pb-20 px-2 sm:px-4 md:px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="container mx-auto relative px-0">
        <div className="space-y-16">
          <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-8 animate-fade-in px-2 sm:px-4">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-foreground leading-[1.1] tracking-tight">
              Automate{" "}
              <span className="text-primary">80%</span>
              {" "}of Your Support
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground leading-relaxed font-light">
              Deploy an AI agent that learns your business, handles customer queries across all channels, 
              and performs support actions automatically — all while you focus on growth.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 justify-center">
              <Button size="lg" className="group text-base font-bold h-12 sm:h-14 px-6 sm:px-8 shadow-xl hover:shadow-2xl bg-gradient-to-r from-primary to-primary/90 transition-all duration-300 hover:scale-[1.05] active:scale-95 touch-manipulation">
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="text-base font-semibold h-12 sm:h-14 px-6 sm:px-8 border-2 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] active:scale-95 touch-manipulation">
                Watch Demo
              </Button>
            </div>

            {/* Social Proof Section */}
            <div className="pt-6 md:pt-8 space-y-4 md:space-y-6">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <span className="font-medium">Trusted by 500+ businesses</span>
              </div>
              
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 max-w-3xl mx-auto">
                <div className="group bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-xl border-2 border-border/30 hover:border-primary/30 rounded-xl p-4 space-y-2 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 touch-manipulation active:scale-95">
                  <Quote className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                  <p className="text-sm text-foreground italic leading-relaxed">"Cut our response time from hours to seconds. Game changer!"</p>
                  <p className="text-xs text-muted-foreground font-semibold">- Amelia</p>
                </div>
                
                <div className="group bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-xl border-2 border-border/30 hover:border-primary/30 rounded-xl p-4 space-y-2 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 touch-manipulation active:scale-95">
                  <Quote className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                  <p className="text-sm text-foreground italic leading-relaxed">"80% reduction in tickets. Our team can finally focus on growth."</p>
                  <p className="text-xs text-muted-foreground font-semibold">- Liam</p>
                </div>
                
                <div className="group bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-xl border-2 border-border/30 hover:border-primary/30 rounded-xl p-4 space-y-2 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 sm:col-span-2 md:col-span-1 touch-manipulation active:scale-95">
                  <Quote className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                  <p className="text-sm text-foreground italic leading-relaxed">"Setup took 5 minutes. Worth every penny and more."</p>
                  <p className="text-xs text-muted-foreground font-semibold">- Olivia</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center px-2 sm:px-4">
            <div className="flex flex-col justify-center space-y-4 md:space-y-6 animate-fade-in lg:order-1 px-2 sm:px-0" style={{
              animationDelay: "0.1s"
            }}>
              <div className="space-y-3 md:space-y-4">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                  Try Our Interactive Agent
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  This is a live AI agent built with <span className="font-semibold text-foreground">AI Support Desk</span>. 
                  Ask it anything about our platform, features, or pricing. Experience firsthand how our technology can transform your customer support.
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground italic">
                  💡 Chat with it now to see autonomous AI support in action!
                </p>
              </div>
            </div>

            <div className="relative h-[500px] sm:h-[550px] lg:h-[500px] animate-fade-in lg:order-2" style={{
              animationDelay: "0.2s"
            }}>
              {/* Animated dark smokey effect */}
              <div className="absolute inset-0 overflow-hidden rounded-2xl lg:rounded-[2rem]">
                <div className="absolute top-0 right-0 w-[150%] h-[150%] bg-gradient-to-bl from-black/40 via-black/20 to-transparent animate-[spin_20s_linear_infinite] opacity-60" />
                <div className="absolute bottom-0 right-0 w-[120%] h-[120%] bg-gradient-to-tl from-black/30 via-transparent to-transparent animate-[spin_15s_linear_infinite_reverse] opacity-50" />
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 via-accent/20 to-primary/30 rounded-2xl lg:rounded-[2rem] blur-3xl animate-pulse" />
              <div className="absolute -inset-2 lg:-inset-4 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-[1.5rem] lg:rounded-[2.5rem] blur-2xl opacity-50" />
              <div className="relative h-full">
                <InteractiveChat />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
