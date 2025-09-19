import HeroSection from "@/components/HeroSection";
import SponsorsSection from "@/components/SponsorsSection"; 
import Navigation from "@/components/Navigation";
import Marquee from "@/components/Marquee";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, TrendingUp, Shield, Zap } from "lucide-react";
import { TracingBeam } from "@/components/sphere/tracing-beam";

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <Navigation />
      <TracingBeam className="pt-0 pb-16">
        <HeroSection />
        
        {/* Authentication CTA Section */}
        {!user && (
          <section className="py-20 px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-6">
                Ready to Start Your <span className="gradient-text">DeFi Journey</span>?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                Join thousands of users tracking their DeFi investments across multiple chains. 
                Sign up now to unlock personalized portfolio insights.
              </p>
              
              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <div className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-green-500/10 hover:scale-[1.02] animate-slide-up text-center">
                  {/* Gradient border effect on hover */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500/0 via-emerald-500/0 to-teal-500/0 rounded-3xl opacity-0 group-hover:opacity-30 group-hover:from-green-500/20 group-hover:via-emerald-500/20 group-hover:to-teal-500/20 transition-all duration-500 blur-sm" />
                  
                  <div className="relative">
                    {/* Enhanced icon container */}
                    <div className="relative mx-auto mb-6 w-16 h-16">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25 group-hover:shadow-green-500/40 transition-all duration-300 mx-auto">
                        <TrendingUp className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -inset-1 bg-gradient-to-br from-green-500/30 to-emerald-600/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                    </div>
                    
                    <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-white transition-colors duration-300">
                      Real-time Tracking
                    </h3>
                    <p className="text-muted-foreground/80 group-hover:text-muted-foreground transition-colors duration-300 leading-relaxed">
                      Monitor your DeFi positions across Ethereum, Polygon, and more
                    </p>
                  </div>
                </div>
                
                <div className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-blue-500/10 hover:scale-[1.02] animate-slide-up text-center" style={{ animationDelay: '100ms' }}>
                  {/* Gradient border effect on hover */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/0 via-indigo-500/0 to-purple-500/0 rounded-3xl opacity-0 group-hover:opacity-30 group-hover:from-blue-500/20 group-hover:via-indigo-500/20 group-hover:to-purple-500/20 transition-all duration-500 blur-sm" />
                  
                  <div className="relative">
                    {/* Enhanced icon container */}
                    <div className="relative mx-auto mb-6 w-16 h-16">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300 mx-auto">
                        <Shield className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/30 to-indigo-600/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                    </div>
                    
                    <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-white transition-colors duration-300">
                      Secure & Private
                    </h3>
                    <p className="text-muted-foreground/80 group-hover:text-muted-foreground transition-colors duration-300 leading-relaxed">
                      Your data is encrypted and stored securely with enterprise-grade security
                    </p>
                  </div>
                </div>
                
                <div className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/10 hover:scale-[1.02] animate-slide-up text-center" style={{ animationDelay: '200ms' }}>
                  {/* Gradient border effect on hover */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/0 via-pink-500/0 to-rose-500/0 rounded-3xl opacity-0 group-hover:opacity-30 group-hover:from-purple-500/20 group-hover:via-pink-500/20 group-hover:to-rose-500/20 transition-all duration-500 blur-sm" />
                  
                  <div className="relative">
                    {/* Enhanced icon container */}
                    <div className="relative mx-auto mb-6 w-16 h-16">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-all duration-300 mx-auto">
                        <Zap className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -inset-1 bg-gradient-to-br from-purple-500/30 to-pink-600/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                    </div>
                    
                    <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-white transition-colors duration-300">
                      AI-powered Insights
                    </h3>
                    <p className="text-muted-foreground/80 group-hover:text-muted-foreground transition-colors duration-300 leading-relaxed">
                      Get intelligent recommendations and market insights powered by AI
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Button asChild size="lg" className="gap-3 h-14 px-8 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 rounded-2xl">
                  <Link to="/auth">
                    Get Started Free
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 px-8 text-lg bg-white/5 backdrop-blur-xl border-white/20 hover:bg-white/10 hover:border-white/30 hover:scale-105 transition-all duration-300 rounded-2xl">
                  <Link to="/portfolio">
                    View Demo Portfolio
                  </Link>
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground mt-4">
                No credit card required • Free forever plan available
              </p>
            </div>
          </section>
        )}
        
        <SponsorsSection />
        <Marquee />
      </TracingBeam>
    </div>
  );
};

export default Landing;