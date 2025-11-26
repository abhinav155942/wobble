const Footer = () => {
  return (
    <footer className="py-8 md:py-12 px-4 border-t border-border">
      <div className="container mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-6 md:mb-8">
          <div className="space-y-3 md:space-y-4 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-base md:text-lg">A</span>
              </div>
              <span className="font-bold text-base md:text-lg text-foreground">AI Support Desk</span>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              Autonomous customer support that learns your business and handles 80% of tickets automatically.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm md:text-base text-foreground mb-3 md:mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#" className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Integrations
                </a>
              </li>
              <li>
                <a href="#" className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  API Docs
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm md:text-base text-foreground mb-3 md:mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm md:text-base text-foreground mb-3 md:mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Security
                </a>
              </li>
              <li>
                <a href="#" className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  GDPR
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 md:pt-8 border-t border-border">
          <p className="text-xs md:text-sm text-muted-foreground text-center">
            © 2025 AI Support Desk. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
