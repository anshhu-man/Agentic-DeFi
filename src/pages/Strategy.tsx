import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, Zap, BarChart3, Brain, Shield, Rocket, Activity, Sparkles } from "lucide-react";

const Strategy = () => {
  const strategies = [
    {
      id: 1,
      title: "Yield Farming Optimizer",
      description: "AI-optimized yield farming across Uniswap, 1inch, and Rootstock",
      apy: "24.7%",
      risk: "Medium",
      chains: ["Ethereum", "Polygon", "Rootstock"],
      allocation: 75,
      icon: TrendingUp,
      color: "text-accent"
    },
    {
      id: 2,
      title: "Cross-chain Lending",
      description: "Automated lending optimization across multiple protocols",
      apy: "18.3%", 
      risk: "Low",
      chains: ["Polygon", "Rootstock"],
      allocation: 45,
      icon: Target,
      color: "text-primary"
    },
    {
      id: 3,
      title: "DeFi Index Strategy",
      description: "Diversified exposure to top DeFi protocols with rebalancing",
      apy: "16.8%",
      risk: "Low",
      chains: ["Ethereum", "Polygon"],
      allocation: 90,
      icon: BarChart3,
      color: "text-accent"
    }
  ];

  const simulations = [
    { scenario: "Bull Market (+50%)", result: "+127% portfolio value" },
    { scenario: "Bear Market (-30%)", result: "-12% portfolio value" },
    { scenario: "High Volatility", result: "+34% with hedging" },
    { scenario: "Stable Market", result: "+18% steady growth" }
  ];

  return (
    <div className="min-h-screen pt-16">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <span className="gradient-text">AI Strategy</span> Hub
          </h1>
          <p className="text-muted-foreground text-lg">
            Intelligent portfolio strategies powered by onchain AI agents
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Strategy Cards */}
          <div className="lg:col-span-2 space-y-8">
            <div className="grid gap-8">
              {strategies.map((strategy, index) => {
                const Icon = strategy.icon;
                return (
                  <Card 
                    key={strategy.id} 
                    className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-blue-500/10 hover:scale-[1.02] animate-slide-up"
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    {/* Gradient border effect on hover */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-cyan-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-blue-500/20 group-hover:via-purple-500/20 group-hover:to-cyan-500/20 transition-all duration-500 blur-sm" />
                    
                    {/* Floating particles effect */}
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="absolute -top-2 -left-2 w-20 h-20 bg-blue-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-float" />
                      <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-purple-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-float-reverse" />
                    </div>
                    
                    <div className="relative">
                      <CardHeader className="flex flex-row items-start justify-between pb-8 px-0">
                        <div className="flex items-start gap-6">
                          <div className="relative">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-110">
                              <Icon className="w-8 h-8 text-white" />
                            </div>
                            <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/30 to-purple-600/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 ">
                              <div className="w-full h-full bg-green-400 rounded-full animate-ping" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-2xl font-bold text-foreground group-hover:text-white transition-colors duration-300 mb-3">
                              {strategy.title}
                            </CardTitle>
                            <p className="text-muted-foreground/80 text-base leading-relaxed">
                              {strategy.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                          <Badge 
                            variant="outline" 
                            className="px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-400/30 rounded-full font-bold text-lg group-hover:bg-gradient-to-r group-hover:from-green-500/30 group-hover:to-emerald-500/30 group-hover:border-green-400/50 transition-all duration-300 group-hover:scale-105"
                          >
                            <Sparkles className="w-4 h-4 mr-1" />
                            {strategy.apy}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                            <Activity className="w-3 h-3" />
                            Live APY
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="px-0 space-y-8">
                        <div className="grid grid-cols-3 gap-6">
                          <div className="text-center p-5 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-300 group-hover:scale-105">
                            <p className="text-sm text-muted-foreground/70 font-medium mb-3">Risk Level</p>
                            <div className="flex flex-col items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                strategy.risk === "Low" ? "bg-green-500/20 text-green-400" :
                                strategy.risk === "Medium" ? "bg-yellow-500/20 text-yellow-400" :
                                "bg-red-500/20 text-red-400"
                              }`}>
                                <Shield className="w-4 h-4" />
                              </div>
                              <span className={`text-lg font-bold ${
                                strategy.risk === "Low" ? "text-green-400" :
                                strategy.risk === "Medium" ? "text-yellow-400" :
                                "text-red-400"
                              }`}>
                                {strategy.risk}
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-center p-5 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-300 group-hover:scale-105">
                            <p className="text-sm text-muted-foreground/70 font-medium mb-3">Allocation</p>
                            <div className="space-y-3">
                              <div className="relative w-16 h-16 mx-auto">
                                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 32 32">
                                  <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/10" />
                                  <circle 
                                    cx="16" 
                                    cy="16" 
                                    r="14" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeDasharray={`${strategy.allocation * 0.88} 88`}
                                    className="text-blue-400 transition-all duration-1000"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-sm font-bold text-foreground">{strategy.allocation}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-center p-5 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-300 group-hover:scale-105">
                            <p className="text-sm text-muted-foreground/70 font-medium mb-3">Chains</p>
                            <div className="flex flex-col items-center gap-2">
                              <div className="text-2xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                                {strategy.chains.length}
                              </div>
                              <div className="flex -space-x-1">
                                {strategy.chains.slice(0, 3).map((_, i) => (
                                  <div key={i} className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-background" />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground/70 font-medium">Supported Networks</p>
                          <div className="flex gap-3 flex-wrap">
                            {strategy.chains.map((chain) => (
                              <Badge 
                                key={chain} 
                                variant="outline" 
                                className="px-3 py-1.5 bg-white/5 text-muted-foreground border-white/20 rounded-full font-medium hover:bg-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105"
                              >
                                {chain}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-4 pt-4">
                          <Button className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40">
                            <Rocket className="w-4 h-4 mr-2" />
                            Deploy Strategy
                          </Button>
                          <Button 
                            variant="outline" 
                            className="h-12 px-6 bg-white/5 backdrop-blur-xl border-white/20 rounded-xl hover:bg-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105"
                          >
                            <Brain className="w-4 h-4 mr-2" />
                            Simulate
                          </Button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* AI Analysis Panels */}
          <div className="space-y-8">
            <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/10 animate-slide-up" style={{ animationDelay: '300ms' }}>
              {/* Gradient border effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/0 via-pink-500/0 to-blue-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-purple-500/20 group-hover:via-pink-500/20 group-hover:to-blue-500/20 transition-all duration-500 blur-sm" />
              
              <div className="relative">
                <CardHeader className="px-0 pb-6">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    AI What-if Analysis
                  </CardTitle>
                  <p className="text-sm text-muted-foreground/80 mt-2">
                    Neural network scenario testing for optimal outcomes
                  </p>
                </CardHeader>
                
                <CardContent className="px-0 space-y-4">
                  <div className="space-y-4">
                    {simulations.map((sim, index) => (
                      <div 
                        key={index} 
                        className="group/item p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-sm text-foreground group-hover/item:text-white transition-colors duration-300">
                            {sim.scenario}
                          </p>
                          <div className="w-2 h-2 rounded-full bg-green-400 " />
                        </div>
                        <p className="text-xs text-muted-foreground/70 leading-relaxed">
                          {sim.result}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <div className="h-1 bg-white/10 rounded-full flex-1">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${65 + Math.random() * 30}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground/60">
                            {Math.floor(85 + Math.random() * 10)}% confidence
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full h-12 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-400/30 rounded-xl hover:bg-gradient-to-r hover:from-purple-600/30 hover:to-pink-600/30 hover:border-purple-400/50 transition-all duration-300 hover:scale-105"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Run Custom Analysis
                  </Button>
                </CardContent>
              </div>
            </Card>

            <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-emerald-500/10 animate-slide-up" style={{ animationDelay: '450ms' }}>
              {/* Gradient border effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/0 via-teal-500/0 to-cyan-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-emerald-500/20 group-hover:via-teal-500/20 group-hover:to-cyan-500/20 transition-all duration-500 blur-sm" />
              
              <div className="relative">
                <CardHeader className="px-0 pb-6">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    Risk Analytics
                  </CardTitle>
                  <p className="text-sm text-muted-foreground/80 mt-2">
                    Real-time risk assessment and portfolio protection
                  </p>
                </CardHeader>
                
                <CardContent className="px-0 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-300">
                      <p className="text-xs text-muted-foreground/70 font-medium mb-2">Portfolio Beta</p>
                      <p className="text-xl font-bold text-blue-400">0.85</p>
                      <div className="mt-2 h-1 bg-white/10 rounded-full">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: '85%' }} />
                      </div>
                    </div>
                    <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-300">
                      <p className="text-xs text-muted-foreground/70 font-medium mb-2">Sharpe Ratio</p>
                      <p className="text-xl font-bold text-emerald-400">2.1</p>
                      <div className="mt-2 h-1 bg-white/10 rounded-full">
                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: '75%' }} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-300">
                      <span className="text-sm text-muted-foreground/80">Max Drawdown</span>
                      <span className="font-bold text-red-400">-12.4%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-300">
                      <span className="text-sm text-muted-foreground/80">Value at Risk</span>
                      <span className="font-bold text-foreground group-hover:text-white transition-colors duration-300">$1,240</span>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-400/20">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 " />
                      <span className="text-sm font-medium text-emerald-300">Portfolio Health: Excellent</span>
                    </div>
                    <p className="text-xs text-muted-foreground/80 leading-relaxed">
                      Risk-adjusted returns are optimal. AI models suggest maintaining current allocation.
                    </p>
                  </div>
                </CardContent>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Strategy;