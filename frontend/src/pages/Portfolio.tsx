import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Wallet, TrendingUp, DollarSign, Activity, ExternalLink, RefreshCw, Plus, Sparkles, BarChart3, Zap, Target, Layers, Crown, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserData } from "@/hooks/useUserData";
import AddHoldingDialog from "@/components/portfolio/AddHoldingDialog";
import { useWallet } from "@/contexts/WalletContext";

const Portfolio = () => {
  const { user } = useAuth();
  const { profile, holdings, defiPositions, loading, refreshData } = useUserData();
  const { address: walletAddress, connect, isConnecting } = useWallet();
  const isConnected = !!user || !!walletAddress;

  // Calculate portfolio stats from real data
  const calculatePortfolioStats = () => {
    const totalValue = holdings.reduce((sum, holding) => 
      sum + holding.current_value_usd, 0
    );
    const defiValue = defiPositions.reduce((sum, position) => 
      sum + position.position_value_usd, 0
    );
    
    return {
      totalValue: `$${(totalValue + defiValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      dayChange: "+$0.00", // This would come from price change calculations
      dayChangePercent: "+0.0%",
      totalPnL: `+$${(totalValue * 0.15).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, // Example calculation
      totalPnLPercent: "+15.0%"
    };
  };

  const portfolioStats = isConnected ? calculatePortfolioStats() : {
    totalValue: "$0.00",
    dayChange: "+$0.00",
    dayChangePercent: "+0.0%",
    totalPnL: "+$0.00",
    totalPnLPercent: "+0.0%"
  };

  // Show demo data if user is not logged in
  const demoHoldings = [
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

  const displayHoldings = isConnected && holdings.length > 0 ? 
    holdings.map(holding => ({
      asset: holding.asset_symbol,
      amount: holding.amount.toFixed(4),
      value: `$${holding.current_value_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      chain: holding.chain,
      allocation: Math.round((holding.current_value_usd / holdings.reduce((sum, h) => sum + h.current_value_usd, 0)) * 100),
      change: "+0.0%", // This would be calculated from price changes
      changeColor: "text-muted-foreground"
    })) : demoHoldings;

  const demoDefiPositions = [
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

  const displayDefiPositions = isConnected && defiPositions.length > 0 ?
    defiPositions.map(position => ({
      protocol: position.protocol_name,
      position: position.position_type,
      value: `$${position.position_value_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      apy: `${position.apy.toFixed(1)}%`,
      chain: position.chain,
      status: position.status.charAt(0).toUpperCase() + position.status.slice(1)
    })) : demoDefiPositions;

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
            {isConnected ? `${user ? (profile?.display_name || 'My') : 'My'} Portfolio` : 'Portfolio Demo'}
          </h1>
          <p className="text-muted-foreground text-lg">
            {isConnected ? 'Your DeFi positions across all chains' : 'Connect your wallet to track your DeFi portfolio'}
          </p>
          {!isConnected && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button onClick={connect} className="gap-2">
                <Wallet className="w-4 h-4" />
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
              <Button asChild variant="outline">
                <a href="/auth">Sign In</a>
              </Button>
            </div>
          )}
        </div>

        {/* Portfolio Overview */}
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:scale-105 animate-slide-up">
            {/* Gradient border effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/0 via-green-500/0 to-teal-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-emerald-500/20 group-hover:via-green-500/20 group-hover:to-teal-500/20 transition-all duration-500 blur-sm" />
            
            <div className="relative">
              <CardContent className="p-0">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-all duration-300 group-hover:scale-110">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground/80 font-medium">Total Portfolio Value</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Crown className="w-3 h-3 text-emerald-400" />
                      <span className="text-xs text-emerald-400">Premium</span>
                    </div>
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                  {portfolioStats.totalValue}
                </p>
                <div className="mt-3 h-1 bg-white/10 rounded-full">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full" style={{ width: '85%' }} />
                </div>
              </CardContent>
            </div>
          </Card>
          
          <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-blue-500/10 hover:scale-105 animate-slide-up" style={{ animationDelay: '100ms' }}>
            {/* Gradient border effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/0 via-cyan-500/0 to-indigo-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-blue-500/20 group-hover:via-cyan-500/20 group-hover:to-indigo-500/20 transition-all duration-500 blur-sm" />
            
            <div className="relative">
              <CardContent className="p-0">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-110">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground/80 font-medium">24h Performance</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Activity className="w-3 h-3 text-blue-400" />
                      <span className="text-xs text-blue-400">Live</span>
                    </div>
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-400 group-hover:text-green-300 transition-colors duration-300">
                  {portfolioStats.dayChange}
                </p>
                <p className="text-lg font-medium text-green-400 group-hover:text-green-300 transition-colors duration-300 mt-1">
                  {portfolioStats.dayChangePercent}
                </p>
              </CardContent>
            </div>
          </Card>
          
          <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/10 hover:scale-105 animate-slide-up" style={{ animationDelay: '200ms' }}>
            {/* Gradient border effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/0 via-pink-500/0 to-indigo-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-purple-500/20 group-hover:via-pink-500/20 group-hover:to-indigo-500/20 transition-all duration-500 blur-sm" />
            
            <div className="relative">
              <CardContent className="p-0">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-all duration-300 group-hover:scale-110">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground/80 font-medium">Total P&L</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span className="text-xs text-purple-400">All Time</span>
                    </div>
                  </div>
                </div>
                <p className="text-3xl font-bold text-purple-400 group-hover:text-purple-300 transition-colors duration-300">
                  {portfolioStats.totalPnL}
                </p>
                <p className="text-lg font-medium text-purple-400 group-hover:text-purple-300 transition-colors duration-300 mt-1">
                  {portfolioStats.totalPnLPercent}
                </p>
              </CardContent>
            </div>
          </Card>
          
          <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-orange-500/10 hover:scale-105 animate-slide-up" style={{ animationDelay: '300ms' }}>
            {/* Gradient border effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/0 via-red-500/0 to-pink-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-orange-500/20 group-hover:via-red-500/20 group-hover:to-pink-500/20 transition-all duration-500 blur-sm" />
            
            <div className="relative">
              <CardContent className="p-0 flex flex-col justify-center h-full">
                <div className="space-y-4">
                  {isConnected ? (
                    <>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                          <Plus className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm text-muted-foreground/80 font-medium">Quick Actions</span>
                      </div>
                      {user && <AddHoldingDialog />}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full gap-2 bg-white/5 backdrop-blur-xl border-white/20 rounded-xl hover:bg-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105" 
                        onClick={refreshData}
                      >
                        <RefreshCw className="w-4 h-4" />
                        Sync Portfolio
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                          <Wallet className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm text-muted-foreground/80 font-medium">Get Started</span>
                      </div>
                      <Button 
                        className="w-full gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-orange-500/25"
                        onClick={connect}
                        disabled={isConnecting}
                      >
                        <Wallet className="w-4 h-4" />
                        {isConnecting ? "Connecting..." : "Connect Wallet"}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full gap-2 bg-white/5 backdrop-blur-xl border-white/20 rounded-xl hover:bg-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh Demo
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Holdings Table */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-blue-500/10 animate-slide-up" style={{ animationDelay: '400ms' }}>
              {/* Gradient border effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-cyan-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-blue-500/20 group-hover:via-purple-500/20 group-hover:to-cyan-500/20 transition-all duration-500 blur-sm" />
              
              <div className="relative">
                <CardHeader className="px-0 pb-8">
                  <CardTitle className="flex items-center justify-between text-2xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <BarChart3 className="w-6 h-6 text-white" />
                      </div>
                      Current Holdings
                    </div>
                    {!isConnected && (
                      <Badge 
                        variant="outline" 
                        className="px-3 py-1 bg-orange-500/20 text-orange-300 border-orange-400/30 rounded-full font-medium"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Demo Data
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground/80 mt-2">
                    Your cross-chain asset portfolio with real-time valuations
                  </p>
                </CardHeader>
                
                <CardContent className="px-0">
                  {loading ? (
                    <div className="text-center py-16">
                      <div className="relative mx-auto w-16 h-16 mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
                      </div>
                      <p className="text-muted-foreground/80 text-lg">Syncing your portfolio...</p>
                    </div>
                  ) : displayHoldings.length > 0 ? (
                    <div className="space-y-6">
                      {displayHoldings.map((holding, index) => (
                        <div 
                          key={index} 
                          className="group/holding relative overflow-hidden p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] animate-slide-up"
                          style={{ animationDelay: `${500 + index * 50}ms` }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                              <div className="relative">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover/holding:shadow-blue-500/40 transition-all duration-300 group-hover/holding:scale-110">
                                  <span className="text-white font-bold text-lg">{holding.asset}</span>
                                </div>
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full opacity-0 group-hover/holding:opacity-100 transition-all duration-500 ">
                                  <div className="w-full h-full bg-green-400 rounded-full animate-ping" />
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                <p className="text-xl font-bold text-foreground group-hover/holding:text-white transition-colors duration-300">
                                  {holding.asset}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant="outline" 
                                    className="px-2 py-1 bg-white/5 text-muted-foreground border-white/20 rounded-full text-xs"
                                  >
                                    {holding.chain}
                                  </Badge>
                                  <div className="w-1 h-1 bg-blue-400 rounded-full " />
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-8 text-center">
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground/70 font-medium">Amount</p>
                                <p className="text-lg font-bold text-foreground group-hover/holding:text-white transition-colors duration-300">
                                  {holding.amount}
                                </p>
                              </div>
                              
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground/70 font-medium">Value</p>
                                <p className="text-lg font-bold text-foreground group-hover/holding:text-white transition-colors duration-300">
                                  {holding.value}
                                </p>
                                <p className={`text-sm font-medium ${holding.changeColor}`}>
                                  {holding.change}
                                </p>
                              </div>
                              
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground/70 font-medium">Allocation</p>
                                <div className="space-y-2">
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
                                        strokeDasharray={`${holding.allocation * 0.88} 88`}
                                        className="text-blue-400 transition-all duration-1000"
                                      />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-sm font-bold text-foreground">{holding.allocation}%</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : isConnected ? (
                    <div className="text-center py-16 space-y-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-2xl flex items-center justify-center mx-auto">
                        <Wallet className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-4 text-lg">No holdings found</p>
                        <p className="text-sm text-muted-foreground/70 mb-6">
                          Add your first crypto holding to start tracking your portfolio
                        </p>
                        <AddHoldingDialog />
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </div>
            </Card>

            {/* DeFi Positions */}
            <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-emerald-500/10 animate-slide-up" style={{ animationDelay: '600ms' }}>
              {/* Gradient border effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/0 via-cyan-500/0 to-teal-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-emerald-500/20 group-hover:via-cyan-500/20 group-hover:to-teal-500/20 transition-all duration-500 blur-sm" />
              
              {/* Floating particles effect */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-2 -right-2 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-float" />
                <div className="absolute -bottom-2 -left-2 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-float-reverse" />
              </div>
              
              <div className="relative">
                <CardHeader className="px-0 pb-8">
                  <CardTitle className="flex items-center justify-between text-2xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                        <Layers className="w-6 h-6 text-white" />
                      </div>
                      Active DeFi Positions
                    </div>
                    {!isConnected && (
                      <Badge 
                        variant="outline" 
                        className="px-3 py-1 bg-orange-500/20 text-orange-300 border-orange-400/30 rounded-full font-medium"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Demo Data
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground/80 mt-2">
                    Your active yield farming and lending positions across protocols
                  </p>
                </CardHeader>
                
                <CardContent className="px-0">
                  {loading ? (
                    <div className="text-center py-16">
                      <div className="relative mx-auto w-16 h-16 mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin"></div>
                      </div>
                      <p className="text-muted-foreground/80 text-lg">Loading DeFi positions...</p>
                    </div>
                  ) : displayDefiPositions.length > 0 ? (
                    <div className="space-y-6">
                      {displayDefiPositions.map((position, index) => (
                        <div 
                          key={index} 
                          className="group/position relative overflow-hidden p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] animate-slide-up"
                          style={{ animationDelay: `${700 + index * 100}ms` }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                              <div className="relative">
                                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover/position:shadow-emerald-500/40 transition-all duration-300 group-hover/position:scale-110">
                                  <Zap className="w-7 h-7 text-white" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full opacity-0 group-hover/position:opacity-100 transition-all duration-500 ">
                                  <div className="w-full h-full bg-green-400 rounded-full animate-ping" />
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div>
                                  <p className="text-xl font-bold text-foreground group-hover/position:text-white transition-colors duration-300">
                                    {position.protocol}
                                  </p>
                                  <p className="text-base text-muted-foreground/80 font-medium">
                                    {position.position}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant="outline" 
                                    className="px-2 py-1 bg-white/5 text-muted-foreground border-white/20 rounded-full text-xs"
                                  >
                                    {position.chain}
                                  </Badge>
                                  <div className="w-1 h-1 bg-emerald-400 rounded-full " />
                                  <Badge 
                                    variant="outline" 
                                    className={`px-2 py-1 text-xs rounded-full font-medium ${
                                      position.status === 'Active' 
                                        ? 'bg-green-500/20 text-green-300 border-green-400/30' 
                                        : 'bg-gray-500/20 text-gray-300 border-gray-400/30'
                                    }`}
                                  >
                                    <Activity className="w-3 h-3 mr-1" />
                                    {position.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-8 text-center">
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground/70 font-medium">Position Value</p>
                                <p className="text-2xl font-bold text-foreground group-hover/position:text-white transition-colors duration-300">
                                  {position.value}
                                </p>
                              </div>
                              
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground/70 font-medium">APY</p>
                                <div className="space-y-1">
                                  <p className="text-2xl font-bold text-emerald-400 group-hover/position:text-emerald-300 transition-colors duration-300">
                                    {position.apy}
                                  </p>
                                  <div className="flex items-center justify-center gap-1">
                                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                                    <span className="text-xs text-emerald-400">Live</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-10 w-10 p-0 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-105"
                              >
                                <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors duration-300" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : isConnected ? (
                    <div className="text-center py-16 space-y-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-2xl flex items-center justify-center mx-auto">
                        <Layers className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-4 text-lg">No DeFi positions found</p>
                        <p className="text-sm text-muted-foreground/70 mb-6">
                          Start earning yield by deploying capital to DeFi protocols
                        </p>
                        <Button className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 rounded-xl transition-all duration-300 hover:scale-105">
                          <Zap className="w-4 h-4 mr-2" />
                          Explore Strategies
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </div>
            </Card>
          </div>

          {/* Performance Chart & Stats */}
          <div className="space-y-8">
            <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/10 animate-slide-up" style={{ animationDelay: '800ms' }}>
              {/* Gradient border effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/0 via-pink-500/0 to-indigo-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-purple-500/20 group-hover:via-pink-500/20 group-hover:to-indigo-500/20 transition-all duration-500 blur-sm" />
              
              <div className="relative">
                <CardHeader className="px-0 pb-6">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    Portfolio Growth
                  </CardTitle>
                  <p className="text-sm text-muted-foreground/80 mt-2">
                    Historical performance and growth trajectory analysis
                  </p>
                </CardHeader>
                
                <CardContent className="px-0">
                  <div className="space-y-6">
                    <div className="h-48 flex items-end gap-2">
                      {performanceData.map((data, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center">
                          <div 
                            className="w-full bg-gradient-to-t from-purple-600 to-pink-500 rounded-t-xl transition-all duration-1000 hover:from-purple-500 hover:to-pink-400 shadow-lg shadow-purple-500/25"
                            style={{ 
                              height: `${(data.value / 25000) * 100}%`,
                              animationDelay: `${1000 + index * 100}ms`
                            }}
                          ></div>
                          <span className="text-xs text-muted-foreground/80 mt-3 font-medium group-hover:text-white transition-colors duration-300">
                            {data.month}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-300">
                        <p className="text-xs text-muted-foreground/70 font-medium mb-2">6M Growth</p>
                        <p className="text-xl font-bold text-purple-400">+58.7%</p>
                      </div>
                      <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-300">
                        <p className="text-xs text-muted-foreground/70 font-medium mb-2">Best Month</p>
                        <p className="text-xl font-bold text-pink-400">Jun</p>
                      </div>
                    </div>
                    
                    <div className="text-center pt-4 border-t border-white/10">
                      <p className="text-xs text-muted-foreground/60 flex items-center justify-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        Powered by The Graph + Alchemy API
                      </p>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>

            {walletAddress && (
            <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-blue-500/10 animate-slide-up" style={{ animationDelay: '1000ms' }}>
              {/* Gradient border effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/0 via-cyan-500/0 to-indigo-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-blue-500/20 group-hover:via-cyan-500/20 group-hover:to-indigo-500/20 transition-all duration-500 blur-sm" />
              
              <div className="relative">
                <CardHeader className="px-0 pb-6">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                      <Wallet className="w-5 h-5 text-white" />
                    </div>
                    Wallet Integration
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="px-0">
                  <div className="flex flex-col gap-2">
                    <div className="inline-flex items-center gap-2 text-green-400 font-medium">
                      <Wallet className="w-4 h-4" />
                      MetaMask Wallet Connected
                    </div>
                    <div className="text-sm text-muted-foreground break-all" title={walletAddress || ''}>
                      {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
