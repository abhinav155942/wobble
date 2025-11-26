import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "Perfect for small businesses getting started with AI support",
    features: [
      "1 AI Agent",
      "1 Website widget",
      "200 conversations/month",
      "Basic analytics",
      "Email support",
      "Knowledge base (10k tokens)",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$79",
    period: "/month",
    description: "Scale your support with multi-channel automation",
    features: [
      "3 AI Agents",
      "Web + WhatsApp + Instagram",
      "1,000 conversations/month",
      "Advanced analytics",
      "Priority support",
      "Knowledge base (50k tokens)",
      "Shopify integration",
      "Custom branding",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Pro",
    price: "$199",
    period: "/month",
    description: "Enterprise-grade automation with unlimited scale",
    features: [
      "Unlimited AI Agents",
      "All channels included",
      "Unlimited conversations",
      "Real-time analytics",
      "Dedicated support",
      "Unlimited knowledge base",
      "All integrations",
      "Advanced workflows",
      "RBAC & audit logs",
      "SLA guarantees",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const Pricing = () => {
  return (
    <section id="pricing" className="py-12 md:py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center space-y-3 md:space-y-4 mb-10 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground px-2">
            Simple, Transparent Pricing
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Start with a 14-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative border-2 overflow-hidden group touch-manipulation ${
                plan.highlighted
                  ? "border-primary/50 shadow-2xl md:scale-105 bg-gradient-to-b from-card via-card/95 to-card/85 ring-2 ring-primary/10"
                  : "border-border/40 bg-gradient-to-b from-card/90 to-card/60 hover:border-primary/40"
              } hover:shadow-3xl transition-all duration-300 hover:-translate-y-1 active:scale-[0.99] rounded-xl md:rounded-2xl`}
            >
              {plan.highlighted && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-accent/8 to-primary/8 pointer-events-none" />
                  <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 px-4 md:px-6 py-1.5 md:py-2 bg-gradient-to-r from-primary via-primary/90 to-accent text-primary-foreground text-xs md:text-sm font-bold rounded-full shadow-lg hover:shadow-xl transition-shadow z-10 animate-pulse">
                    Most Popular
                  </div>
                </>
              )}
              <CardHeader className="space-y-4 md:space-y-6 pb-6 md:pb-8 relative">
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2 md:mb-3">{plan.name}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{plan.description}</p>
                </div>
                <div className="flex items-baseline">
                  <span className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">{plan.price}</span>
                  <span className="text-muted-foreground ml-2 md:ml-3 text-base md:text-lg">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 md:space-y-8 relative">
                <Button
                  className={`w-full h-11 md:h-12 text-sm md:text-base font-bold ${
                    plan.highlighted 
                      ? "shadow-lg hover:shadow-2xl bg-gradient-to-r from-primary to-primary/90" 
                      : "border-2 hover:border-primary/50"
                  } transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] touch-manipulation`}
                  variant={plan.highlighted ? "default" : "outline"}
                  size="lg"
                >
                  {plan.cta}
                </Button>
                <ul className="space-y-3 md:space-y-4">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-2.5 md:space-x-3 group/item hover:bg-primary/5 -mx-2 px-2 py-1 rounded-lg transition-all duration-200">
                      <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:scale-110 group-hover/item:bg-primary/20 transition-all">
                        <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-primary" />
                      </div>
                      <span className="text-sm md:text-base text-muted-foreground leading-relaxed group-hover/item:text-foreground transition-colors">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 md:mt-12 text-center px-4">
          <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">
            All plans include 14-day free trial • No credit card required
          </p>
          <p className="text-xs md:text-sm text-muted-foreground">
            Need custom enterprise pricing?{" "}
            <a href="#" className="text-primary hover:underline">
              Contact our sales team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
