import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Twitter, Linkedin, Sparkles, Brain, Layers, Users, Zap, Shield, Target, Activity, Star, Crown, Rocket } from "lucide-react";
import aiPatternImage from "@/assets/ai-pattern.jpg";

const About = () => {
  const team = [
    { name: "Sumant Tirkey", role: "Co-Founder & CEO", avatar: "👨‍💻" },
    { name: "Monalisa Behara", role: "Head of AI", avatar: "👩‍🔬" },
    { name: "Anshuman Acharya", role: "Blockchain Engineer", avatar: "👨‍🚀" },
    { name: "Ishika Poddar", role: "Product Designer", avatar: "👩‍🎨" },
    { name: "Arijit Bhaumik", role: "DeFi Strategist", avatar: "👨‍📊" }
  ];

  const sponsors = [
    { name: "Polygon", logo: "🔷", description: "Scaling Ethereum" },
    { name: "Uniswap", logo: "🦄", description: "Decentralized Exchange" },
    { name: "Pyth", logo: "⚡", description: "Real-time Oracles" },
    { name: "Alchemy", logo: "⚗️", description: "Web3 Infrastructure" },
    { name: "1inch", logo: "🔄", description: "DEX Aggregation" },
    { name: "Rootstock", logo: "₿", description: "Bitcoin DeFi" },
    { name: "The Graph", logo: "📊", description: "Data Indexing" }
  ];

  return (
    <div className="min-h-screen pt-16">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 relative">
          <div className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-16 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-blue-500/10 animate-slide-up">
            {/* Gradient border effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-cyan-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-blue-500/20 group-hover:via-purple-500/20 group-hover:to-cyan-500/20 transition-all duration-500 blur-sm" />
            
            {/* Floating particles effect */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-float" />
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-purple-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-float-reverse" />
              <div className="absolute top-1/3 -right-2 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-float" />
            </div>
            
            <div className="absolute inset-0 opacity-5 rounded-3xl overflow-hidden">
              <img 
                src={aiPatternImage} 
                alt="AI Pattern" 
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-110">
                  <Rocket className="w-8 h-8 text-white" />
                </div>
                <div className="w-2 h-2 bg-blue-400 rounded-full " />
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div className="w-2 h-2 bg-purple-400 rounded-full " />
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/25">
                  <Layers className="w-7 h-7 text-white" />
                </div>
              </div>
              
              <h1 className="text-6xl font-bold mb-8 group-hover:text-white transition-colors duration-300">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:via-purple-300 group-hover:to-cyan-300 transition-all duration-300">
                  Our Mission
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground/80 max-w-4xl mx-auto leading-relaxed group-hover:text-white/90 transition-colors duration-300">
                Making DeFi navigation easier with AI-powered meta-protocol search. 
                We're building the future of decentralized finance through intelligent 
                automation and cross-chain unification.
              </p>
              
              <div className="flex items-center justify-center gap-8 mt-12">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
                  <Star className="w-4 h-4" />
                  <span>AI-Powered</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-purple-400">
                  <Shield className="w-4 h-4" />
                  <span>Secure</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-cyan-400">
                  <Zap className="w-4 h-4" />
                  <span>Fast</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mission Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-blue-500/10 hover:scale-105 animate-slide-up text-center">
            {/* Gradient border effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/0 via-cyan-500/0 to-indigo-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-blue-500/20 group-hover:via-cyan-500/20 group-hover:to-indigo-500/20 transition-all duration-500 blur-sm" />
            
            <div className="relative">
              <CardContent className="p-0">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-110 mx-auto">
                    <Brain className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-br from-blue-500/30 to-cyan-600/30 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 ">
                    <div className="w-full h-full bg-green-400 rounded-full animate-ping" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-foreground group-hover:text-white transition-colors duration-300">AI-First Approach</h3>
                <p className="text-muted-foreground/80 leading-relaxed group-hover:text-white/80 transition-colors duration-300">
                  Leveraging advanced AI agents to provide intelligent insights and automated strategies
                </p>
                <div className="mt-6 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full " />
                  <span className="text-xs text-blue-400 font-medium">Neural Networks</span>
                </div>
              </CardContent>
            </div>
          </Card>
          
          <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/10 hover:scale-105 animate-slide-up text-center" style={{ animationDelay: '100ms' }}>
            {/* Gradient border effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/0 via-pink-500/0 to-indigo-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-purple-500/20 group-hover:via-pink-500/20 group-hover:to-indigo-500/20 transition-all duration-500 blur-sm" />
            
            <div className="relative">
              <CardContent className="p-0">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-all duration-300 group-hover:scale-110 mx-auto">
                    <Layers className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-br from-purple-500/30 to-pink-600/30 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 ">
                    <div className="w-full h-full bg-green-400 rounded-full animate-ping" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-foreground group-hover:text-white transition-colors duration-300">Cross-Chain Unity</h3>
                <p className="text-muted-foreground/80 leading-relaxed group-hover:text-white/80 transition-colors duration-300">
                  Breaking down silos between blockchains to create a unified DeFi experience
                </p>
                <div className="mt-6 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full " />
                  <span className="text-xs text-purple-400 font-medium">Multi-Chain</span>
                </div>
              </CardContent>
            </div>
          </Card>
          
          <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:scale-105 animate-slide-up text-center" style={{ animationDelay: '200ms' }}>
            {/* Gradient border effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/0 via-teal-500/0 to-cyan-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-emerald-500/20 group-hover:via-teal-500/20 group-hover:to-cyan-500/20 transition-all duration-500 blur-sm" />
            
            <div className="relative">
              <CardContent className="p-0">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-all duration-300 group-hover:scale-110 mx-auto">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-br from-emerald-500/30 to-teal-600/30 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 ">
                    <div className="w-full h-full bg-green-400 rounded-full animate-ping" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-foreground group-hover:text-white transition-colors duration-300">User Empowerment</h3>
                <p className="text-muted-foreground/80 leading-relaxed group-hover:text-white/80 transition-colors duration-300">
                  Democratizing access to sophisticated DeFi strategies for users of all experience levels
                </p>
                <div className="mt-6 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full " />
                  <span className="text-xs text-emerald-400 font-medium">Accessible</span>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>

        {/* Team Section */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-4xl font-bold">
                Meet the <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Team</span>
              </h2>
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-muted-foreground/80 text-lg max-w-2xl mx-auto">
              Brilliant minds building the future of decentralized finance
            </p>
          </div>
          
          <div className="grid md:grid-cols-5 gap-6">
            {team.map((member, index) => (
              <Card key={index} className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-orange-500/10 hover:scale-105 animate-slide-up text-center" style={{ animationDelay: `${300 + index * 100}ms` }}>
                {/* Gradient border effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/0 via-red-500/0 to-pink-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-orange-500/20 group-hover:via-red-500/20 group-hover:to-pink-500/20 transition-all duration-500 blur-sm" />
                
                <div className="relative">
                  <CardContent className="p-0">
                    <div className="relative mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:shadow-orange-500/40 transition-all duration-300 group-hover:scale-110 mx-auto text-2xl">
                        {member.avatar}
                      </div>
                      <div className="absolute -inset-1 bg-gradient-to-br from-orange-500/30 to-red-600/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 ">
                        <div className="w-full h-full bg-green-400 rounded-full animate-ping" />
                      </div>
                    </div>
                    
                    <h3 className="font-bold mb-2 text-foreground group-hover:text-white transition-colors duration-300">{member.name}</h3>
                    <p className="text-sm text-muted-foreground/80 mb-6 group-hover:text-white/70 transition-colors duration-300">{member.role}</p>
                    
                    <div className="flex justify-center gap-3">
                      <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all duration-300 hover:scale-110 group/social">
                        <Github className="w-4 h-4 text-muted-foreground/70 group-hover/social:text-white cursor-pointer transition-colors duration-300" />
                      </div>
                      <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all duration-300 hover:scale-110 group/social">
                        <Twitter className="w-4 h-4 text-muted-foreground/70 group-hover/social:text-blue-400 cursor-pointer transition-colors duration-300" />
                      </div>
                      <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all duration-300 hover:scale-110 group/social">
                        <Linkedin className="w-4 h-4 text-muted-foreground/70 group-hover/social:text-blue-600 cursor-pointer transition-colors duration-300" />
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Sponsors Section */}
        <div>
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-4xl font-bold">
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Powered By</span>
              </h2>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Zap className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-muted-foreground/80 text-lg max-w-3xl mx-auto">
              Integrating with the most trusted protocols in Web3 to deliver seamless experiences
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 lg:grid-cols-7 gap-6 mb-12">
            {sponsors.map((sponsor, index) => (
              <Card key={index} className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-cyan-500/10 hover:scale-105 animate-slide-up text-center" style={{ animationDelay: `${800 + index * 50}ms` }}>
                {/* Gradient border effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/0 via-blue-500/0 to-indigo-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-cyan-500/20 group-hover:via-blue-500/20 group-hover:to-indigo-500/20 transition-all duration-500 blur-sm" />
                
                <div className="relative">
                  <CardContent className="p-0">
                    <div className="relative mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/25 group-hover:shadow-cyan-500/40 transition-all duration-300 group-hover:scale-110 mx-auto text-xl">
                        {sponsor.logo}
                      </div>
                      <div className="absolute -inset-1 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 ">
                        <div className="w-full h-full bg-green-400 rounded-full animate-ping" />
                      </div>
                    </div>
                    
                    <h3 className="font-bold text-sm mb-2 text-foreground group-hover:text-white transition-colors duration-300">{sponsor.name}</h3>
                    <p className="text-xs text-muted-foreground/80 group-hover:text-white/70 transition-colors duration-300 leading-relaxed">{sponsor.description}</p>
                    
                    <div className="mt-4 flex items-center justify-center gap-1">
                      <div className="w-1 h-1 bg-cyan-400 rounded-full " />
                      <Activity className="w-3 h-3 text-cyan-400" />
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
          
          <div className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-emerald-500/10 animate-slide-up" style={{ animationDelay: '1200ms' }}>
            {/* Gradient border effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/0 via-teal-500/0 to-cyan-500/0 rounded-3xl opacity-0 group-hover:opacity-30 group-hover:from-emerald-500/30 group-hover:via-teal-500/30 group-hover:to-cyan-500/30 transition-all duration-500 blur-sm" />
            
            <div className="relative text-center">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full " />
                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
              </div>
              
              <p className="text-muted-foreground/80 text-lg leading-relaxed group-hover:text-white/80 transition-colors duration-300 max-w-4xl mx-auto">
                Our partnerships represent more than integrations—they're the foundation of a 
                <span className="text-emerald-400 font-medium"> unified DeFi ecosystem</span> where protocols work together 
                to deliver unprecedented user experiences across all major blockchains.
              </p>
              
              <div className="flex items-center justify-center gap-8 mt-8">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  <span>$50B+ TVL</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-teal-400">
                  <Activity className="w-4 h-4" />
                  <span>7 Protocols</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-cyan-400">
                  <Layers className="w-4 h-4" />
                  <span>Multi-Chain</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;