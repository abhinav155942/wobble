import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-3 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <span className="text-primary-foreground font-bold text-xl">A</span>
            </div>
            <span className="font-bold text-xl text-foreground">AI Support Desk</span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-all duration-200 font-medium hover:scale-105">
              Features
            </a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-all duration-200 font-medium hover:scale-105">
              How It Works
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-all duration-200 font-medium hover:scale-105">
              Pricing
            </a>
            <a href="/auth">
              <Button variant="outline" size="sm" className="hover:scale-105 transition-transform">
                Sign In
              </Button>
            </a>
            <a href="/auth">
              <Button size="sm" className="shadow-md hover:shadow-lg hover:scale-105 transition-all">Get Started</Button>
            </a>
          </div>

          <button
            className="md:hidden text-foreground"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 space-y-4">
            <a
              href="#features"
              className="block text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="block text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsOpen(false)}
            >
              How It Works
            </a>
            <a
              href="#pricing"
              className="block text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Pricing
            </a>
            <div className="flex flex-col space-y-2 pt-2">
              <a href="/auth">
                <Button variant="outline" size="sm" className="w-full">
                  Sign In
                </Button>
              </a>
              <a href="/auth">
                <Button size="sm" className="w-full">Get Started</Button>
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
