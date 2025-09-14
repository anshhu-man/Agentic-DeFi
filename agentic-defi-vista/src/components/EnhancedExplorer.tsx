import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Bot, 
  Shield, 
  Loader2,
  AlertCircle,
  CheckCircle,
  Zap
} from "lucide-react";
import { apiService, QueryResponse } from "@/services/api";

const EnhancedExplorer = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [useRealData, setUseRealData] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Mock data (original)
  const mockProtocolData = [
    {
      name: "Uniswap V3",
      type: "DEX",
      tvl: "$4.2B",
      apy: "12.4%",
      chain: "Ethereum",
      risk: "Low",
      color: "text-accent"
    },
    {
      name: "1inch Limit Orders",
      type: "Aggregator", 
      tvl: "$890M",
      apy: "8.7%",
      chain: "Polygon",
      risk: "Medium",
      color: "text-primary"
    },
    {
      name: "Rootstock Bridge",
      type: "Bridge",
      tvl: "$1.1B", 
      apy: "15.2%",
      chain: "Bitcoin",
      risk: "Medium",
      color: "text-accent"
    }
  ];

  const mockAiInsights = [
    "📈 ETH/USDC pair showing 23% APY spike on Uniswap",
    "⚠️ High slippage detected on smaller altcoin pairs",
    "🔄 Optimal swap route: ETH → USDC via 1inch (0.03% fee)",
    "💡 Recommendation: Consider yield farming on Polygon for lower gas"
  ];

  // Health check query
  const { data: healthData, isError: healthError } = useQuery({
    queryKey: ['backend-health'],
    queryFn: () => apiService.checkHealth(),
    refetchInterval: 30000, // Check every 30 seconds
    retry: false,
  });

  // Initialize data
  useEffect(() => {
    setSearchResults(mockProtocolData);
    setAiInsights(mockAiInsights);
  }, []);

  // Handle search with backend integration
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    if (useRealData && healthData?.status === 'healthy') {
      setIsSearching(true);
      setSearchError(null);
      
      try {
        const response: QueryResponse = await apiService.query({
          query: searchQuery
        });

        if (response.success) {
          // Transform backend data to frontend format
          const transformedData = apiService.transformProtocolData(response.data.results.data);
          setSearchResults(transformedData.length > 0 ? transformedData : mockProtocolData);
          
          // Update AI insights with real agent results
          const realInsights = apiService.transformAIInsights(response.data.agentResults);
          if (realInsights.length > 0) {
            setAiInsights([
              `🔍 Query: "${response.data.query}"`,
              `🎯 Intent: ${response.data.intent} (${Math.round(response.data.confidence * 100)}% confidence)`,
              `⚡ Processed in ${response.data.executionTime}ms`,
              ...realInsights,
              ...response.data.recommendations.map(rec => `💡 ${rec}`)
            ]);
          }
        }
      } catch (error: any) {
        setSearchError(apiService.handleAPIError(error));
        // Fallback to mock data
        setSearchResults(mockProtocolData);
        setAiInsights(mockAiInsights);
      } finally {
        setIsSearching(false);
      }
    } else {
      // Use mock data
      setSearchResults(mockProtocolData);
      setAiInsights(mockAiInsights);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen pt-16">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <span className="gradient-text">Meta-Protocol</span> Explorer
          </h1>
          <p className="text-muted-foreground text-lg">
            Search across all DeFi protocols with AI-powered insights
          </p>
        </div>

        {/* Backend Status & Controls */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/10">
            <div className="flex items-center gap-3">
              {healthData?.status === 'healthy' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <div>
                <p className="text-sm font-medium">
                  Backend Status: {healthData?.status === 'healthy' ? 'Connected' : 'Disconnected'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {healthData?.status === 'healthy' 
                    ? `AI Model: ${healthData.services.aiModel}` 
                    : 'Using mock data'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="real-data" className="text-sm">Live Data</Label>
              <Switch
                id="real-data"
                checked={useRealData}
                onCheckedChange={setUseRealData}
                disabled={healthData?.status !== 'healthy'}
              />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search tokens, pools, vaults, strategies..."
              className="pl-12 h-14 text-lg glass-card border-border/50"
            />
            <Button 
              onClick={handleSearch}
              disabled={isSearching}
              className="absolute right-2 top-2 h-10"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {searchError && (
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{searchError}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="tokens" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="tokens">Tokens</TabsTrigger>
                <TabsTrigger value="pools">Liquidity Pools</TabsTrigger>
                <TabsTrigger value="vaults">Vaults</TabsTrigger>
                <TabsTrigger value="lending">Lending Markets</TabsTrigger>
              </TabsList>

              <TabsContent value="tokens" className="space-y-4">
                {isSearching ? (
                  // Loading skeletons
                  Array.from({ length: 3 }).map((_, index) => (
                    <Card key={index} className="glass-card">
                      <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-10 h-10 rounded-lg" />
                          <div>
                            <Skeleton className="h-5 w-32 mb-2" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-16" />
                      </CardHeader>
                      <CardContent className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  // Results
                  searchResults.map((protocol, index) => (
                    <Card key={index} className="glass-card hover:shadow-glow transition-all duration-300">
                      <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{protocol.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{protocol.type}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={protocol.color}>
                          {protocol.chain}
                        </Badge>
                      </CardHeader>
                      
                      <CardContent className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">TVL</p>
                          <p className="text-lg font-semibold">{protocol.tvl}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">APY</p>
                          <p className="text-lg font-semibold text-accent">{protocol.apy}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Risk</p>
                          <p className="text-lg font-semibold">{protocol.risk}</p>
                        </div>
                      </CardContent>
                      
                      {/* Show additional data from backend */}
                      {protocol.currentPrice && (
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                            <div>Price: {protocol.currentPrice}</div>
                            <div>24h: {protocol.priceChange24h}</div>
                            <div>Volume: {protocol.volume24h}</div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="pools">
                <Card className="glass-card">
                  <CardContent className="p-6 text-center">
                    <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Liquidity Pools</h3>
                    <p className="text-muted-foreground">Discover optimal liquidity providing opportunities</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="vaults">
                <Card className="glass-card">
                  <CardContent className="p-6 text-center">
                    <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Yield Vaults</h3>
                    <p className="text-muted-foreground">Automated yield farming strategies</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="lending">
                <Card className="glass-card">
                  <CardContent className="p-6 text-center">
                    <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Lending Markets</h3>
                    <p className="text-muted-foreground">Borrow and lend across protocols</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* AI Insights Sidebar */}
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  AI Agent Insights
                  {useRealData && healthData?.status === 'healthy' && (
                    <Badge variant="outline" className="text-xs">
                      Live
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {aiInsights.map((insight, index) => (
                  <div key={index} className="p-3 rounded-lg bg-muted/20 text-sm">
                    {insight}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Backend Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {healthData?.services && (
                  <div className="space-y-2">
                    {Object.entries(healthData.services).map(([service, status]) => (
                      <div key={service} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{service.replace(/([A-Z])/g, ' $1')}</span>
                        {typeof status === 'boolean' ? (
                          status ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )
                        ) : (
                          <span className="text-muted-foreground">{status}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs text-center text-muted-foreground">
                    {useRealData ? 'Using live AI agent data' : 'Using mock data for demo'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Portfolio Widget</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full mb-4">
                  Connect MetaMask
                </Button>
                <div className="text-center text-muted-foreground text-sm">
                  Connect your wallet to view portfolio insights
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedExplorer;
