import { Upload, Brain, MessageCircle, BarChart } from "lucide-react";
const steps = [{
  icon: Upload,
  title: "1. Connect Your Data",
  description: "Import your website, docs, and product catalog. Connect Shopify, WooCommerce, or Stripe in minutes."
}, {
  icon: Brain,
  title: "2. AI Learns Your Business",
  description: "Our RAG engine processes your data, creates embeddings, and builds a knowledge base tailored to your business."
}, {
  icon: MessageCircle,
  title: "3. Deploy Across Channels",
  description: "Add the web widget, connect WhatsApp, Instagram, and email. Your AI agent is ready to handle customers."
}, {
  icon: BarChart,
  title: "4. Monitor & Optimize",
  description: "Track performance, review conversations, and refine workflows. Watch your support costs drop dramatically."
}];
const HowItWorks = () => {
  return <section id="how-it-works" className="py-12 md:py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center space-y-3 md:space-y-4 mb-10 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground px-2">
            From Setup to Support in Under 10 Minutes
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            No complex configurations. No technical expertise needed. Just connect and go.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {steps.map((step, index) => <div key={index} className="relative group cursor-pointer">
              {index < steps.length - 1 && <div className="hidden lg:block absolute top-16 md:top-20 left-[60%] w-full h-px bg-gradient-to-r from-primary/40 via-accent/40 to-transparent group-hover:from-primary/60 group-hover:via-accent/60 transition-all duration-500" />}
              <div className="space-y-3 md:space-y-5 hover:-translate-y-1 md:hover:-translate-y-2 active:scale-95 transition-all duration-300 touch-manipulation">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-2xl md:rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
                  <div className="relative w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-primary via-primary/90 to-accent rounded-2xl md:rounded-3xl items-center justify-center mx-auto lg:mx-0 shadow-xl group-hover:shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex flex-row">
                    <step.icon className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground group-hover:scale-110 transition-transform" />
                  </div>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-foreground text-center lg:text-left group-hover:text-primary transition-colors duration-200">
                  {step.title}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground text-center lg:text-left leading-relaxed group-hover:text-foreground/80 transition-colors">
                  {step.description}
                </p>
              </div>
            </div>)}
        </div>

        <div className="relative group mt-12 md:mt-20 p-6 md:p-12 bg-gradient-to-br from-primary/15 via-accent/8 to-primary/15 rounded-2xl md:rounded-[2rem] border-2 border-primary/30 text-center space-y-4 md:space-y-6 shadow-2xl backdrop-blur-sm hover:shadow-3xl hover:border-primary/50 transition-all duration-300 overflow-hidden cursor-pointer touch-manipulation active:scale-[0.99]">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground px-2 group-hover:text-primary transition-colors duration-200">
              Ready to Transform Your Customer Support?
            </h3>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4 mt-4 md:mt-6 group-hover:text-foreground/80 transition-colors">
              Join hundreds of businesses saving thousands of hours and cutting support costs by 60-80%.
            </p>
          </div>
        </div>
      </div>
    </section>;
};
export default HowItWorks;
