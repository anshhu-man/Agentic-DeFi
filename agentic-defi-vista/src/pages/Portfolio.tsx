import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Wallet, TrendingUp, DollarSign, Activity, ExternalLink, RefreshCw } from "lucide-react";

const Portfolio = () => {
  const portfolioStats = {
    totalValue: "$24,567.89",
    dayChange: "+$1,234.56",
    dayChangePercent: "+5.3%",
    totalPnL: "+$8,904.12",
    totalPnLPercent: "+56.8%"
  };

  const holdings = [
    {
      asset: "ETH",
      amount: "8.45",
      value: "$14,230.50",
      chain: "Ethereum",
      allocation: 58,
      change: "+2.4%",
      changeColor: "text-accent"
    },
    {
      asset: "USDC",
      amount: "5,250.00", 
      value: "$5,250.00",
      chain: "Polygon",
      allocation: 21,
      change: "0.0%",
      changeColor: "text-muted-foreground"
    },
    {
      asset: "UNI",
      amount: "342.18",
      value: "$2,736.84",
      chain: "Ethereum", 
      allocation: 11,
      change: "+8.7%",
      changeColor: "text-accent"
    },
    {
      asset: "RBTC",
      amount: "0.085",
      value: "$2,350.55",
      chain: "Rootstock",
      allocation: 10,
      change: "+12.1%",
      changeColor: "text-accent"
    }
  ];

  const defiPositions = [
    {
      protocol: "Uniswap V3",
      position: "ETH/USDC LP",
      value: "$8,450.32",
      apy: "18.7%",
      chain: "Ethereum",
      status: "Active"
    },
    {
      protocol: "1inch Farming",
      position: "1INCH Staking",
      value: "$3,240.18",
      apy: "24.3%", 
      chain: "Polygon",
      status: "Active"
    },
    {
      protocol: "Rootstock DeFi",
      position: "RBTC Lending",
      value: "$2,876.39",
      apy: "12.4%",
      chain: "Rootstock", 
      status: "Active"
    }
  ];

  const performanceData = [
    { month: "Jan", value: 15500 },
    { month: "Feb", value: 16800 },
    { month: "Mar", value: 18200 },
    { month: "Apr", value: 19500 },
    { month: "May", value: 22100 },
    { month: "Jun", value: 24567 }
  ];

  return (
    <div className="min-h-screen pt-16">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            My <span className="gradient-text">Portfolio</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Track your DeFi positions across all chains
          </p>
        </div>

        {/* Portfolio Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Total Value</span>
              </div>
              <p className="text-2xl font-bold">{portfolioStats.totalValue}</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                <span className="text-sm text-muted-foreground">24h Change</span>
              </div>
              <p className="text-2xl font-bold text-accent">
                {portfolioStats.dayChange}
              </p>
              <p className="text-sm text-accent">{portfolioStats.dayChangePercent}</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Total P&L</span>
              </div>
              <p className="text-2xl font-bold text-accent">
                {portfolioStats.totalPnL}
              </p>
              <p className="text-sm text-accent">{portfolioStats.totalPnLPercent}</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-6 flex flex-col justify-center">
              <Button className="w-full mb-3 gap-2">
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Holdings Table */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Current Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {holdings.map((holding, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/10">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{holding.asset}</span>
                        </div>
                        <div>
                          <p className="font-semibold">{holding.asset}</p>
                          <p className="text-sm text-muted-foreground">{holding.chain}</p>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <p className="font-semibold">{holding.amount}</p>
                        <p className="text-sm text-muted-foreground">Amount</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="font-semibold">{holding.value}</p>
                        <p className={`text-sm ${holding.changeColor}`}>{holding.change}</p>
                      </div>
                      
                      <div className="text-center min-w-[80px]">
                        <Progress value={holding.allocation} className="h-2 mb-1" />
                        <p className="text-sm text-muted-foreground">{holding.allocation}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* DeFi Positions */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Active DeFi Positions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {defiPositions.map((position, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/10">
                      <div>
                        <p className="font-semibold">{position.protocol}</p>
                        <p className="text-sm text-muted-foreground">{position.position}</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="font-semibold">{position.value}</p>
                        <Badge variant="outline" className="text-xs">
                          {position.chain}
                        </Badge>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-semibold text-accent">{position.apy}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-xs">
                            {position.status}
                          </Badge>
                          <ExternalLink className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Chart & Stats */}
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Portfolio Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-48 flex items-end gap-2">
                    {performanceData.map((data, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-gradient-primary rounded-t"
                          style={{ height: `${(data.value / 25000) * 100}%` }}
                        ></div>
                        <span className="text-xs text-muted-foreground mt-2">
                          {data.month}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-center pt-4 border-t border-border/50">
                    <p className="text-sm text-muted-foreground">
                      Powered by The Graph + Alchemy API
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Wallet Integration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start gap-3">
                  <div className="w-6 h-6 bg-orange-500 rounded"></div>
                  MetaMask
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded"></div>
                  WalletConnect
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded"></div>
                  Coinbase Wallet
                </Button>
                
                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs text-center text-muted-foreground">
                    Connect your wallet to view real-time portfolio data
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;