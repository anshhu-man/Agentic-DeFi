import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Zap, Target, Shield } from "lucide-react";
import heroImage from "@/assets/hero-defi.jpg";
import AnimeSphereAnimation from "@/components/sphere/anime-sphere-animation";

const HeroSection = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="DeFi AI Technology" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-subtle"></div>
      </div>
      
      {/* Anime Sphere Animation Background */}
      <div className="absolute inset-0 z-0 opacity-50">
        <AnimeSphereAnimation />
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
        
        <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
          <Link to="/explorer">
            <Button size="lg" className="gap-3 h-16 px-10 text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 rounded-2xl group">
              Launch App
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
          </Link>
          
          <Button variant="outline" size="lg" className="gap-3 h-16 px-10 text-xl font-semibold bg-white/5 backdrop-blur-xl border-white/20 hover:bg-white/10 hover:border-white/30 hover:scale-105 hover:shadow-xl hover:shadow-white/10 transition-all duration-300 rounded-2xl group">
            <Shield className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
            Learn More
          </Button>
        </div>
        
        {/* Enhanced Feature cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-blue-500/10 hover:scale-[1.02] animate-slide-up text-center">
            {/* Gradient border effect on hover */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-cyan-500/0 rounded-3xl opacity-0 group-hover:opacity-30 group-hover:from-blue-500/20 group-hover:via-purple-500/20 group-hover:to-cyan-500/20 transition-all duration-500 blur-sm" />
            
            <div className="relative">
              {/* Enhanced icon container */}
              <div className="relative mx-auto mb-6 w-16 h-16">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300 mx-auto">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/30 to-purple-600/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
              </div>
              
              <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-white transition-colors duration-300">
                AI-Powered Insights
              </h3>
              <p className="text-muted-foreground/80 group-hover:text-muted-foreground transition-colors duration-300 leading-relaxed">
                Advanced AI agents analyze market data and provide intelligent recommendations
              </p>
            </div>
          </div>
          
          <div className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/10 hover:scale-[1.02] animate-slide-up text-center" style={{ animationDelay: '100ms' }}>
            {/* Gradient border effect on hover */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/0 via-cyan-500/0 to-blue-500/0 rounded-3xl opacity-0 group-hover:opacity-30 group-hover:from-purple-500/20 group-hover:via-cyan-500/20 group-hover:to-blue-500/20 transition-all duration-500 blur-sm" />
            
            <div className="relative">
              {/* Enhanced icon container */}
              <div className="relative mx-auto mb-6 w-16 h-16">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-all duration-300 mx-auto">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-purple-500/30 to-cyan-600/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
              </div>
              
              <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-white transition-colors duration-300">
                Cross-Chain Unified
              </h3>
              <p className="text-muted-foreground/80 group-hover:text-muted-foreground transition-colors duration-300 leading-relaxed">
                Access liquidity and yields across multiple blockchains from one interface
              </p>
            </div>
          </div>
          
          <div className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-cyan-500/10 hover:scale-[1.02] animate-slide-up text-center" style={{ animationDelay: '200ms' }}>
            {/* Gradient border effect on hover */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/0 via-blue-500/0 to-purple-500/0 rounded-3xl opacity-0 group-hover:opacity-30 group-hover:from-cyan-500/20 group-hover:via-blue-500/20 group-hover:to-purple-500/20 transition-all duration-500 blur-sm" />
            
            <div className="relative">
              {/* Enhanced icon container */}
              <div className="relative mx-auto mb-6 w-16 h-16">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/25 group-hover:shadow-cyan-500/40 transition-all duration-300 mx-auto">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
              </div>
              
              <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-white transition-colors duration-300">
                Risk Management
              </h3>
              <p className="text-muted-foreground/80 group-hover:text-muted-foreground transition-colors duration-300 leading-relaxed">
                Real-time risk analysis and automated alerts to protect your portfolio
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;