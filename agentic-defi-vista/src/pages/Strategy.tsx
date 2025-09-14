import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, Zap, BarChart3, Brain, Shield } from "lucide-react";

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
          <div className="lg:col-span-2 space-y-6">
            <div className="grid gap-6">
              {strategies.map((strategy) => {
                const Icon = strategy.icon;
                return (
                  <Card key={strategy.id} className="glass-card hover:shadow-glow transition-all duration-300">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-xl mb-1">{strategy.title}</CardTitle>
                            <p className="text-muted-foreground text-sm">{strategy.description}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={strategy.color}>
                          {strategy.apy} APY
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Risk Level</p>
                          <Badge variant={strategy.risk === "Low" ? "default" : "secondary"}>
                            {strategy.risk}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Allocation</p>
                          <div className="flex items-center gap-2">
                            <Progress value={strategy.allocation} className="flex-1" />
                            <span className="text-sm font-medium">{strategy.allocation}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Supported Chains</p>
                        <div className="flex gap-2">
                          {strategy.chains.map((chain) => (
                            <Badge key={chain} variant="outline" className="text-xs">
                              {chain}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-3 pt-2">
                        <Button className="flex-1">Deploy Strategy</Button>
                        <Button variant="outline">Simulate</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Simulation Panel */}
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  What-if Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  AI-powered scenario testing for your strategies
                </p>
                
                <div className="space-y-3">
                  {simulations.map((sim, index) => (
                    <div key={index} className="p-3 rounded-lg bg-muted/20">
                      <p className="font-medium text-sm">{sim.scenario}</p>
                      <p className="text-xs text-muted-foreground mt-1">{sim.result}</p>
                    </div>
                  ))}
                </div>
                
                <Button variant="outline" className="w-full">
                  <Zap className="w-4 h-4 mr-2" />
                  Run Custom Simulation
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-accent" />
                  Risk Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Portfolio Beta</span>
                    <span className="font-medium">0.85</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Max Drawdown</span>
                    <span className="font-medium text-destructive">-12.4%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Sharpe Ratio</span>
                    <span className="font-medium text-accent">2.1</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Value at Risk</span>
                    <span className="font-medium">$1,240</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Strategy;