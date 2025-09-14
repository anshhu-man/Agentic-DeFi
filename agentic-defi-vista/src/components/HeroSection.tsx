import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Zap, Target, Shield } from "lucide-react";
import heroImage from "@/assets/hero-defi.jpg";

const HeroSection = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="DeFi AI Technology" 
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-subtle"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        <div className="animate-float">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="gradient-text">Agentic DeFi</span>
            <br />
            <span className="text-foreground">Explorer</span>
          </h1>
        </div>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          One Search. All Protocols. Powered by Onchain AI.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link to="/explorer">
            <Button size="lg" className="gap-3 text-lg px-8 py-4 glow-effect">
              Launch App
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          
          <Button variant="outline" size="lg" className="gap-3 text-lg px-8 py-4">
            <Shield className="w-5 h-5" />
            Learn More
          </Button>
        </div>
        
        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="glass-card p-6 rounded-xl">
            <Zap className="w-8 h-8 text-primary mb-4 mx-auto" />
            <h3 className="text-lg font-semibold mb-2">AI-Powered Insights</h3>
            <p className="text-muted-foreground text-sm">
              Advanced AI agents analyze market data and provide intelligent recommendations
            </p>
          </div>
          
          <div className="glass-card p-6 rounded-xl">
            <Target className="w-8 h-8 text-accent mb-4 mx-auto" />
            <h3 className="text-lg font-semibold mb-2">Cross-Chain Unified</h3>
            <p className="text-muted-foreground text-sm">
              Access liquidity and yields across multiple blockchains from one interface
            </p>
          </div>
          
          <div className="glass-card p-6 rounded-xl">
            <Shield className="w-8 h-8 text-primary mb-4 mx-auto" />
            <h3 className="text-lg font-semibold mb-2">Risk Management</h3>
            <p className="text-muted-foreground text-sm">
              Real-time risk analysis and automated alerts to protect your portfolio
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;