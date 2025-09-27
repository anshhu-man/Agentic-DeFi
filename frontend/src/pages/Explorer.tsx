import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, DollarSign, Activity, Bot, Shield, RefreshCw, Vault, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import EnhancedSearchSection from "@/components/search/enhanced-search-section";
import apiService from "@/services/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import VaultCreator from "@/components/vault/VaultCreator";
import VaultDashboard from "@/components/vault/VaultDashboard";
import PythMonitor from "@/components/vault/PythMonitor";
import { depositETH, setTriggersUSD, getPosition as getVaultPosition, executeOnce, getKeeperHealth } from "@/services/vault";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const Explorer = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [protocols, setProtocols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Dexes");
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [connectingWallet, setConnectingWallet] = useState(false);

  // Pyth-powered Explore data
  const defaultSymbols = ["ETH/USD", "BTC/USD", "MATIC/USD", "USDC/USD", "USDT/USD", "DAI/USD"];

  // Seed data to immediately populate UI; hydrated by live Pyth data on load
  const seedAssetPrices: Array<{ symbol: string; price: number; publishTime: string | null }> = [
    { symbol: "ETH/USD", price: 4524.09, publishTime: new Date().toISOString() },
    { symbol: "BTC/USD", price: 115845.21, publishTime: new Date().toISOString() },
    { symbol: "MATIC/USD", price: 0.68, publishTime: new Date().toISOString() },
    { symbol: "USDC/USD", price: 0.9998, publishTime: new Date().toISOString() },
    { symbol: "USDT/USD", price: 1.0001, publishTime: new Date().toISOString() },
    { symbol: "DAI/USD", price: 0.9999, publishTime: new Date().toISOString() },
  ];
  const seedVols: Record<string, number> = {
    "ETH/USD": 22.0,
    "BTC/USD": 28.0,
    "MATIC/USD": 35.0,
    "USDC/USD": 1.0,
    "USDT/USD": 1.0,
    "DAI/USD": 1.0,
  };

  const [assetPrices, setAssetPrices] = useState<Array<{ symbol: string; price: number; confidence: number; publishTime: string | null }>>(
    seedAssetPrices.map(p => ({ ...p, confidence: 95.5 }))
  );
  const [assetVols, setAssetVols] = useState<Record<string, number>>(seedVols);
  const [correlations, setCorrelations] = useState<Record<string, number>>({});
  const [loadingPyth, setLoadingPyth] = useState(false);
  const [series, setSeries] = useState<Record<string, number[]>>({});

  // Vault-related state
  const [vaultPositions, setVaultPositions] = useState<any[]>([]);
  const [triggerEvents, setTriggerEvents] = useState<any[]>([]);
  const [triggerChecks, setTriggerChecks] = useState<any[]>([]);
  const [confidenceBands, setConfidenceBands] = useState<any[]>([]);
  const [pythConnected, setPythConnected] = useState(true);

  const computeReturns = (arr: number[]) => {
    const rets: number[] = [];
    for (let i = 1; i < arr.length; i++) {
      const prev = arr[i - 1];
      const curr = arr[i];
      if (isFinite(prev) && isFinite(curr) && prev !== 0) {
        rets.push((curr - prev) / prev);
      }
    }
    return rets;
  };

  const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const stddev = (arr: number[]) => {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    const v = mean(arr.map((x) => (x - m) * (x - m)));
    return Math.sqrt(v);
  };

  const computeVolatilityFromSeries = (prices: number[]) => {
    const rets = computeReturns(prices);
    if (rets.length < 2) return 0;
    return stddev(rets) * 100;
  };

  const computeCorrelationFromSeries = (a: number[], b: number[]) => {
    const n = Math.min(a.length, b.length);
    if (n < 5) return 0;
    const aLast = a.slice(a.length - n);
    const bLast = b.slice(b.length - n);
    const ra = computeReturns(aLast);
    const rb = computeReturns(bLast);
    const m = Math.min(ra.length, rb.length);
    if (m < 3) return 0;
    const raLast = ra.slice(ra.length - m);
    const rbLast = rb.slice(rb.length - m);
    const ma = mean(raLast);
    const mb = mean(rbLast);
    let num = 0,
      da = 0,
      db = 0;
    for (let i = 0; i < m; i++) {
      const xa = raLast[i] - ma;
      const xb = rbLast[i] - mb;
      num += xa * xb;
      da += xa * xa;
      db += xb * xb;
    }
    const denom = Math.sqrt(da) * Math.sqrt(db);
    return denom === 0 ? 0 : num / denom;
  };

  const riskFromVol = (vol?: number) => {
    if (vol == null) return "Unknown";
    if (vol < 20) return "Low";
    if (vol < 40) return "Medium";
    return "High";
  };

  const deriveApyFromVol = (vol?: number) => {
    // Simple proxy: lower volatility -> higher "stable yield" signal (for demo until real subgraphs are wired)
    if (vol == null) return 0;
    const score = Math.max(0, 20 - vol); // cap at 20
    return Number((score * 0.8).toFixed(1)); // 0 - 16% illustrative
  };

  // Fetch Pyth data for Explore (prices, volatilities, correlations)
  const fetchPythData = async () => {
    try {
      setLoadingPyth(true);
      const symbols = defaultSymbols;

      const [prices, vols] = await Promise.all([
        apiService.getPythPrices(symbols).catch(() => []),
        apiService.getPythVolatilities(symbols, 24).catch(() => []),
      ]);

      // Prepare maps
      const prevBy = new Map(assetPrices.map((a) => [a.symbol, a]));
      const seedBy = new Map(seedAssetPrices.map((a) => [a.symbol, a]));
      const liveBy = new Map(
        (prices as Array<{ symbol: string; price: number; confidence: number | null; publishTime: string | null }>).map((a) => [a.symbol, a])
      );

      // Merge live prices with previous or seed data to avoid empty UI (include confidence)
      const nextPrices: Array<{ symbol: string; price: number; confidence: number; publishTime: string | null }> = defaultSymbols.map(
        (sym) => {
          const live = liveBy.get(sym) as any;
          const prev = prevBy.get(sym) as any;
          const seed = seedBy.get(sym) as any;
          const base = live || prev || seed;
          return {
            ...base,
            confidence: (live?.confidence ?? prev?.confidence ?? seed?.confidence ?? 95.5) as number
          };
        }
      );
      setAssetPrices(nextPrices);

      // Update in-memory price series for frontend fallback metrics
      const seriesNext: Record<string, number[]> = { ...series };
      for (const sym of defaultSymbols) {
        const price = nextPrices.find((p) => p.symbol === sym)?.price;
        if (typeof price === "number" && isFinite(price)) {
          const arr = Array.isArray(seriesNext[sym]) ? [...seriesNext[sym]] : [];
          arr.push(price);
          // Cap series length to last 120 points
          if (arr.length > 120) arr.splice(0, arr.length - 120);
          seriesNext[sym] = arr;
        }
      }
      setSeries(seriesNext);

      // Build volatility map:
      // 1) take backend non-zero values
      // 2) fill missing/zero with frontend-computed volatility from series
      const volMapFinal: Record<string, number> = { ...seedVols };
      (vols as Array<{ symbol: string; volatility?: number; error?: string }>)?.forEach((v) => {
        if (typeof v.volatility === "number" && v.volatility > 0) {
          volMapFinal[v.symbol] = v.volatility;
        }
      });
      for (const sym of defaultSymbols) {
        if (!(sym in volMapFinal) || volMapFinal[sym] === 0) {
          const arr = seriesNext[sym] || [];
          const v = computeVolatilityFromSeries(arr);
          if (v > 0) volMapFinal[sym] = Number(v.toFixed(2));
        }
      }
      setAssetVols(volMapFinal);

      // Build correlation matrix locally from series (fallback when backend history is unavailable)
      const corrSyms = ["ETH/USD", "BTC/USD", "MATIC/USD", "USDC/USD"].filter((s) => defaultSymbols.includes(s));
      const corrMap: Record<string, number> = {};
      corrSyms.forEach((s) => {
        corrMap[`${s}|${s}`] = 1;
      });
      for (let i = 0; i < corrSyms.length; i++) {
        for (let j = i + 1; j < corrSyms.length; j++) {
          const a = corrSyms[i];
          const b = corrSyms[j];
          const ca = computeCorrelationFromSeries(seriesNext[a] || [], seriesNext[b] || []);
          corrMap[`${a}|${b}`] = ca;
          corrMap[`${b}|${a}`] = ca;
        }
      }
      setCorrelations(corrMap);
    } catch (e) {
      console.error("Failed to fetch Pyth data for Explore:", e);
    } finally {
      setLoadingPyth(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await fetchPythData();
      await fetchProtocols(selectedCategory);
      await fetchVaultData();
      await fetchTriggerChecks();
      try {
        const h = await getKeeperHealth();
        setPythConnected(!!h?.success);
      } catch {
        setPythConnected(false);
      }
    } catch {
      // non-fatal UI refresh
    }
  };

  // Vault-related functions
  const fetchVaultData = async () => {
    if (!walletAddress) return;

    try {
      const [posResp, bands] = await Promise.all([
        getVaultPosition(walletAddress).catch(() => null as any),
        apiService.getConfidenceBands(defaultSymbols).catch(() => []),
      ]);

      setConfidenceBands(bands);

      if (posResp && posResp.position) {
        const amountETH = Number(posResp.position.amountETH || "0");
        const currentPrice = Number(posResp.currentPrice || "0");
        const stopUsd = Number(posResp.position.stopLossPrice18 || "0");
        const takeUsd = Number(posResp.position.takeProfitPrice18 || "0");
        const confAbs = Number(posResp.priceConfidence || "0");
        const entryPrice = currentPrice; // approximate: deposit near-now

        const stopPct = entryPrice > 0 ? ((entryPrice - stopUsd) / entryPrice) * 100 : 0;
        const takePct = entryPrice > 0 ? ((takeUsd - entryPrice) / entryPrice) * 100 : 0;
        const confPct = currentPrice > 0 ? (confAbs / currentPrice) * 100 : 0;

        const position = {
          id: walletAddress,
          asset: "ETH/USD",
          depositAmount: amountETH,
          currentValue: amountETH * currentPrice,
          entryPrice: entryPrice,
          currentPrice: currentPrice,
          stopLoss: Math.max(0, stopPct),
          takeProfit: Math.max(0, takePct),
          confidence: Math.max(0, Math.min(100, confPct)),
          status: posResp.position.active ? "active" : "triggered",
          createdAt: new Date((posResp.position.depositTime || 0) * 1000).toISOString(),
          pnl: 0,
          pnlPercentage: 0,
        };

        setVaultPositions(amountETH > 0 ? [position] : []);
      } else {
        setVaultPositions([]);
      }
    } catch (e) {
      console.error("Failed to fetch vault data:", e);
      setVaultPositions([]);
    }
  };

  const fetchTriggerChecks = async () => {
    if (!walletAddress) return;

    try {
      const checks = await apiService.checkTriggerConditions(walletAddress);
      setTriggerChecks(checks);
    } catch (e) {
      console.error("Failed to check triggers:", e);
    }
  };

  const handleCreateVault = async (config: any) => {
    if (!walletAddress) {
      toast({
        variant: "destructive",
        title: "Wallet not connected",
        description: "Please connect your wallet first",
      });
      return;
    }
    if (!config?.asset || config.asset !== "ETH/USD") {
      toast({
        variant: "destructive",
        title: "Unsupported asset",
        description: "This demo vault currently supports ETH/USD only.",
      });
      return;
    }
    const selected = assetPrices.find((a) => a.symbol === config.asset);
    const currentPrice = Number(selected?.price || 0);
    if (!(currentPrice > 0)) {
      toast({
        variant: "destructive",
        title: "Price unavailable",
        description: "Live price not available; please retry in a moment.",
      });
      return;
    }

    try {
      // 1) Deposit ETH from wallet
      const txDeposit = await depositETH(walletAddress, String(config.depositAmount));
      toast({
        title: "Deposit submitted",
        description: `Tx: ${txDeposit.slice(0, 10)}...`,
      });

      // 2) Compute USD trigger prices from current price and percentages
      const entryPrice = currentPrice;
      const stopUsd = entryPrice * (1 - Number(config.stopLoss || 0) / 100);
      const takeUsd = entryPrice * (1 + Number(config.takeProfit || 0) / 100);

      // 3) Set triggers from wallet in USD terms (scaled 1e18 on-chain)
      const txTriggers = await setTriggersUSD(
        walletAddress,
        stopUsd.toFixed(8),
        takeUsd.toFixed(8)
      );
      toast({
        title: "Triggers set",
        description: `Tx: ${txTriggers.slice(0, 10)}...`,
      });

      await fetchVaultData();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Vault setup failed",
        description: e?.message || "Transaction failed",
      });
    }
  };

  const handleExecuteTrigger = async (
    positionId: string,
    _triggerType: "stop_loss" | "take_profit"
  ) => {
    if (!walletAddress) return;

    try {
      const result = await executeOnce(walletAddress);
      toast({
        title: "Execution submitted",
        description: `Tx: ${result.txHash?.slice(0, 10)}...`,
      });
      await fetchVaultData();

      const mappedType =
        typeof result.triggerType === "string" && result.triggerType.toLowerCase().includes("stop")
          ? "stop_loss"
          : "take_profit";

      setTriggerEvents((prev) => [
        {
          id: Date.now().toString(),
          vaultId: positionId,
          type: mappedType,
          price: Number(result.price18 || "0") / 1e18,
          confidence: 0,
          timestamp: new Date().toISOString(),
          executed: true,
          txHash: result.txHash,
        },
        ...prev,
      ]);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Execution failed",
        description: e?.message || "Transaction failed",
      });
    }
  };

  const handleEmergencyExit = async (positionId: string) => {
    if (!walletAddress) return;

    try {
      const result = await apiService.emergencyExit(positionId, walletAddress);

      if (result.success) {
        toast({
          title: "Emergency exit completed",
          description: `Transaction: ${result.txHash}`,
        });
        fetchVaultData();
      } else {
        throw new Error(result.error || "Emergency exit failed");
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Emergency exit failed",
        description: e.message,
      });
    }
  };

  const handleExecuteFromMonitor = async (check: any) => {
    await handleExecuteTrigger(check.vaultId, check.triggerType);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        })
        .catch(() => {});

      window.ethereum
        .request({ method: "eth_chainId" })
        .then((id: string) => setChainId(id))
        .catch(() => {});

      const handleAccountsChanged = (accounts: string[]) => {
        setWalletAddress(accounts && accounts.length > 0 ? accounts[0] : null);
      };

      const handleChainChanged = (id: string) => {
        setChainId(id);
      };

      try {
        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", handleChainChanged);
      } catch {}

      return () => {
        try {
          window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
          window.ethereum?.removeListener("chainChanged", handleChainChanged);
        } catch {}
      };
    }
  }, []);

  const connectMetaMask = async () => {
    try {
      setConnectingWallet(true);
      if (!window.ethereum) {
        toast({
          variant: "destructive",
          title: "MetaMask not detected",
          description: "Install MetaMask to connect your wallet.",
        });
        window.open("https://metamask.io/download/", "_blank");
        return;
      }
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const selected = Array.isArray(accounts) ? accounts[0] : accounts;
      setWalletAddress(selected);

      const id = await window.ethereum.request({ method: "eth_chainId" });
      setChainId(id);

      toast({
        title: "Wallet connected",
        description: `${selected.slice(0, 6)}...${selected.slice(-4)}`,
      });
    } catch (e: any) {
      const message =
        e?.message || e?.data?.message || "User rejected or request failed";
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: message,
      });
    } finally {
      setConnectingWallet(false);
    }
  };

  const fetchProtocols = async (category = "Dexes") => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('defi-protocols', {
        body: { category }
      });

      if (error) {
        throw new Error(error.message);
      }

      const result = await data;
      
      if (result.success) {
        setProtocols(result.data);
      } else {
        // Use fallback data on API error
        setProtocols(result.data || []);
        toast({
          title: "Using cached data",
          description: "Live data unavailable, showing cached protocols",
        });
      }
    } catch (error) {
      console.error('Error fetching protocols:', error);
      toast({
        variant: "destructive",
        title: "Failed to fetch protocols",
        description: "Using fallback data",
      });
      // Use fallback data
      setProtocols([
        {
          name: "Uniswap V3",
          category: "Dexes",
          tvl: 4200000000,
          estimatedApy: 12.4,
          chain: "Ethereum",
          risk: "Low",
        },
        {
          name: "1inch",
          category: "Dexes",
          tvl: 890000000,
          estimatedApy: 8.7,
          chain: "Multi-chain",
          risk: "Medium",
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProtocols(selectedCategory);
  }, [selectedCategory]);

  // Fetch vault data when wallet connects
  useEffect(() => {
    if (walletAddress) {
      fetchVaultData();
      fetchTriggerChecks();
    }
  }, [walletAddress]);

  // Initial Pyth data fetch (hydrate seeds with live data)
  useEffect(() => {
    fetchPythData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    apiService.checkHealth()
      .then(() => {
        toast({
          title: "Backend connected",
          description:
            "API reachable at " +
            (((import.meta as any).env?.VITE_API_BASE_URL as string) || "http://localhost:3000"),
        });
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Backend unreachable",
          description: "Error while fetching",
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTVL = (tvl: number) => {
    if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(1)}B`;
    if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(0)}M`;
    return `$${tvl.toLocaleString()}`;
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    try {
      const resp = await apiService.query({
        query,
        userAddress: walletAddress || undefined,
      });

      const insights: string[] = [];
      const data = (resp as any)?.data || {};
      if (data?.results?.summary) {
        insights.push(`🧠 ${data.results.summary}`);
      }
      insights.push(
        `🔍 Query: "${data.query || query}"`,
        `🎯 Intent: ${data.intent ?? 'unknown'}${
          data.confidence != null ? ` (${Math.round((data.confidence || 0) * 100)}% confidence)` : ''
        }`,
        `⚡ Processed in ${data.executionTime ?? '—'}ms`
      );
      if (Array.isArray(data.recommendations)) {
        data.recommendations.slice(0, 5).forEach((rec: string) => insights.push(`💡 ${rec}`));
      }
      // Update insights sidebar with backend response
      // Using protocols grid unchanged for now
      // setProtocols(...) could be wired if backend returns structured list
      // But we at least give LLM insights
      // We reuse the list UI below by temporarily replacing its content via toast
      toast({
        title: "Search complete",
        description: "AI agent response received.",
      });
      // Show insights by reusing the notification and console as quick feedback
      console.log("AI Insights:", insights.join("\n"));
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Search failed",
        description: e?.message || "Request failed",
      });
    }
  };

  const aiInsights = [
    "📈 ETH/USDC pair showing 23% APY spike on Uniswap",
    "⚠️ High slippage detected on smaller altcoin pairs",
    "🔄 Optimal swap route: ETH → USDC via 1inch (0.03% fee)",
    "💡 Recommendation: Consider yield farming on Polygon for lower gas"
  ];

  return (
    <div className="min-h-screen pt-16">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Enhanced Search Section with Animations */}
        <EnhancedSearchSection
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearch={handleSearch}
        >
          {/* Header - will fade out when search is focused */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              <span className="gradient-text">Pyth-Powered</span> Safe-Exit Vaults
            </h1>
            <p className="text-muted-foreground text-lg">
              On-chain price-triggered automated risk management with Hermes confidence validation
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-400/30">
                <Shield className="w-3 h-3 mr-1" />
                Confidence-Aware Execution
              </Badge>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-400/30">
                <Zap className="w-3 h-3 mr-1" />
                Hermes Pull Updates
              </Badge>
              <Badge variant="outline" className="bg-green-500/10 text-green-300 border-green-400/30">
                <Activity className="w-3 h-3 mr-1" />
                Real-time Monitoring
              </Badge>
            </div>
          </div>
        </EnhancedSearchSection>

        {/* Main content that will also fade when search is focused */}
        <div className="grid lg:grid-cols-3 gap-8 transition-all duration-500" id="main-content">
          <div className="lg:col-span-2">
            <Tabs defaultValue="vault" className="w-full">
              <div className="flex items-center justify-between mb-8">
                <TabsList className="grid w-full grid-cols-6 max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-1">
                  <TabsTrigger 
                    value="vault" 
                    className="rounded-xl transition-all duration-300 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/25"
                  >
                    <Vault className="w-4 h-4 mr-1" />
                    Vault
                  </TabsTrigger>
                  <TabsTrigger 
                    value="monitor" 
                    className="rounded-xl transition-all duration-300 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-300 data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/25"
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    Pyth Monitor
                  </TabsTrigger>
                  <TabsTrigger 
                    value="protocols" 
                    onClick={() => handleCategoryChange("Dexes")}
                    className="rounded-xl transition-all duration-300 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25"
                  >
                    DEXes
                  </TabsTrigger>
                  <TabsTrigger 
                    value="lending" 
                    onClick={() => handleCategoryChange("Lending")}
                    className="rounded-xl transition-all duration-300 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25"
                  >
                    Lending
                  </TabsTrigger>
                  <TabsTrigger 
                    value="yield" 
                    onClick={() => handleCategoryChange("Yield")}
                    className="rounded-xl transition-all duration-300 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25"
                  >
                    Yield
                  </TabsTrigger>
                  <TabsTrigger 
                    value="derivatives" 
                    onClick={() => handleCategoryChange("Derivatives")}
                    className="rounded-xl transition-all duration-300 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25"
                  >
                    Derivatives
                  </TabsTrigger>
                </TabsList>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  disabled={loading || loadingPyth}
                  className="bg-white/5 backdrop-blur-xl border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingPyth ? 'animate-spin' : ''}`} />
                </Button>
                {loadingPyth && (
                  <Badge variant="outline" className="ml-3 bg-blue-500/10 text-blue-300 border-blue-400/30 rounded-full">
                    Updating…
                  </Badge>
                )}
              </div>

              <TabsContent value="vault" className="space-y-6">
                <div className="grid gap-6">
                  <VaultCreator 
                    assetPrices={assetPrices}
                    onCreateVault={handleCreateVault}
                  />
                  <VaultDashboard
                    positions={vaultPositions}
                    triggerEvents={triggerEvents}
                    assetPrices={assetPrices}
                    onExecuteTrigger={handleExecuteTrigger}
                    onEmergencyExit={handleEmergencyExit}
                  />
                </div>
              </TabsContent>

              <TabsContent value="monitor" className="space-y-6">
                <PythMonitor
                  priceUpdates={assetPrices.map(asset => ({
                    symbol: asset.symbol,
                    price: asset.price,
                    confidence: asset.confidence,
                    publishTime: asset.publishTime || new Date().toISOString(),
                    slot: Math.floor(Math.random() * 1000000),
                    priceChange: 0,
                    priceChangePercentage: 0
                  }))}
                  confidenceBands={confidenceBands}
                  triggerChecks={triggerChecks}
                  isConnected={pythConnected}
                  onRefresh={handleRefresh}
                  onExecuteTrigger={handleExecuteFromMonitor}
                />
              </TabsContent>

              <TabsContent value="protocols" className="space-y-6">
                {assetPrices.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="relative mx-auto w-12 h-12 mb-4">
                      <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
                    </div>
                    <p className="text-muted-foreground/80 text-lg">Loading prices…</p>
                  </div>
                ) : (
                  assetPrices.map((asset, index) => (
                    <Card
                      key={`${asset.symbol}-${index}`}
                      className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-blue-500/10 hover:scale-[1.02] animate-slide-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-cyan-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-blue-500/20 group-hover:via-purple-500/20 group-hover:to-cyan-500/20 transition-all duration-500 blur-sm" />
                      <div className="relative">
                        <CardHeader className="flex flex-row items-center justify-between pb-6 px-0">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300">
                                <DollarSign className="w-7 h-7 text-white" />
                              </div>
                              <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/30 to-purple-600/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                            </div>
                            <div>
                              <CardTitle className="text-xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                                {asset.symbol}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground/80 font-medium mt-1">
                                Price Feed via Pyth
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="px-3 py-1 bg-blue-500/10 text-blue-300 border-blue-400/30 rounded-full font-medium group-hover:bg-blue-500/20 group-hover:border-blue-400/50 transition-all duration-300"
                          >
                            {asset.publishTime ? new Date(asset.publishTime).toLocaleTimeString() : "—"}
                          </Badge>
                        </CardHeader>

                        <CardContent className="px-0">
                          <div className="grid grid-cols-3 gap-6">
                            <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-300">
                              <p className="text-sm text-muted-foreground/70 font-medium mb-2">Price (USD)</p>
                              <p className="text-2xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                                ${Number(asset.price || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                              </p>
                            </div>
                            <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-300">
                              <p className="text-sm text-muted-foreground/70 font-medium mb-2">Volatility (24h)</p>
                              <p className="text-2xl font-bold text-green-400 group-hover:text-green-300 transition-colors duration-300">
                                {assetVols[asset.symbol] != null ? `${assetVols[asset.symbol].toFixed(2)}%` : "—"}
                              </p>
                            </div>
                            <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-300">
                              <p className="text-sm text-muted-foreground/70 font-medium mb-2">Risk Level</p>
                              <p
                                className={`text-2xl font-bold transition-colors duration-300 ${
                                  riskFromVol(assetVols[asset.symbol]) === "Low"
                                    ? "text-green-400 group-hover:text-green-300"
                                    : riskFromVol(assetVols[asset.symbol]) === "Medium"
                                    ? "text-yellow-400 group-hover:text-yellow-300"
                                    : "text-red-400 group-hover:text-red-300"
                                }`}
                              >
                                {riskFromVol(assetVols[asset.symbol])}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  ))
                )}
                {/* Protocols list for the selected category (Dexes/Lending/Yield/Derivatives) */}
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4">Top {selectedCategory}</h3>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="relative mx-auto w-10 h-10 mb-3">
                        <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
                      </div>
                      <p className="text-muted-foreground/80">Loading {selectedCategory}…</p>
                    </div>
                  ) : protocols.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground/80">
                      No {selectedCategory} data available. {selectedCategory === 'Dexes' ? 'Data source may be disabled.' : ''}
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {protocols.map((p, idx) => (
                        <Card key={`${p.name}-${idx}`} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between">
                              <span>{p.name}</span>
                              <Badge variant="outline">{p.chain || '—'}</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Category</p>
                              <p className="font-semibold">{p.category || selectedCategory}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">TVL</p>
                              <p className="font-semibold">{typeof p.tvl === 'number' ? formatTVL(p.tvl) : '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Est. APY</p>
                              <p className="font-semibold">{p.estimatedApy != null ? `${Number(p.estimatedApy).toFixed(1)}%` : '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Risk</p>
                              <p className="font-semibold">{p.risk || '—'}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="lending" className="space-y-4">
                {defaultSymbols.map((sym, index) => {
                  const vol = assetVols[sym];
                  const apy = deriveApyFromVol(vol);
                  return (
                    <Card key={`${sym}-${index}`} className="glass-card hover:shadow-glow transition-all duration-300">
                      <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{sym}</CardTitle>
                            <p className="text-sm text-muted-foreground">Lending Yield (Pyth-driven proxy)</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-accent">
                          Risk: {riskFromVol(vol)}
                        </Badge>
                      </CardHeader>

                      <CardContent className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Price</p>
                          <p className="text-lg font-semibold">
                            ${Number(assetPrices.find((a) => a.symbol === sym)?.price || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Volatility (24h)</p>
                          <p className="text-lg font-semibold text-accent">{vol != null ? `${vol.toFixed(2)}%` : "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Derived APY</p>
                          <p className="text-lg font-semibold text-accent">{apy}%</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>

              <TabsContent value="yield" className="space-y-4">
                {[...defaultSymbols]
                  .map((sym) => {
                    const vol = assetVols[sym];
                    const apy = deriveApyFromVol(vol);
                    return { sym, vol, apy };
                  })
                  .sort((a, b) => b.apy - a.apy)
                  .map(({ sym, vol, apy }, index) => (
                    <Card key={`${sym}-${index}`} className="glass-card hover:shadow-glow transition-all duration-300">
                      <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{sym}</CardTitle>
                            <p className="text-sm text-muted-foreground">Yield ranking by stability</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-accent">
                          Risk: {riskFromVol(vol)}
                        </Badge>
                      </CardHeader>

                      <CardContent className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Price</p>
                          <p className="text-lg font-semibold">
                            ${Number(assetPrices.find((a) => a.symbol === sym)?.price || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Volatility (24h)</p>
                          <p className="text-lg font-semibold">{vol != null ? `${vol.toFixed(2)}%` : "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Derived APY</p>
                          <p className="text-lg font-semibold text-accent">{apy}%</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </TabsContent>

              <TabsContent value="derivatives" className="space-y-4">
                <Card className="glass-card hover:shadow-glow transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Correlation Matrix</CardTitle>
                        <p className="text-sm text-muted-foreground">30-period correlation from Pyth prices</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const syms = ["ETH/USD", "BTC/USD", "MATIC/USD", "USDC/USD"].filter((s) =>
                        defaultSymbols.includes(s)
                      );
                      return (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Asset</TableHead>
                                {syms.map((s) => (
                                  <TableHead key={`head-${s}`}>{s}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {syms.map((row) => (
                                <TableRow key={`row-${row}`}>
                                  <TableCell className="font-medium">{row}</TableCell>
                                  {syms.map((col) => {
                                    const val = correlations[`${row}|${col}`];
                                    const display =
                                      typeof val === "number"
                                        ? (Math.round(val * 100) / 100).toFixed(2)
                                        : row === col
                                        ? "1.00"
                                        : "—";
                                    return <TableCell key={`cell-${row}-${col}`}>{display}</TableCell>;
                                  })}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* AI Insights Sidebar */}
          <div className="space-y-6">
            <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:bg-white/10 hover:border-white/20">
              {/* Gradient border effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-cyan-500/0 rounded-3xl opacity-0 group-hover:opacity-30 group-hover:from-blue-500/30 group-hover:via-purple-500/30 group-hover:to-cyan-500/30 transition-all duration-500 blur-sm" />
              
              <div className="relative">
                <CardHeader className="px-0 pb-6">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/30 to-purple-600/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                    </div>
                    <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      AI Agent Insights
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 space-y-4">
                  {aiInsights.map((insight, index) => (
                    <div 
                      key={index} 
                      className="group/item relative p-4 rounded-2xl bg-white/5 border border-white/10 transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] animate-slide-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="text-sm text-foreground/90 group-hover/item:text-white transition-colors duration-300">
                        {insight}
                      </div>
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-400/50 group-hover/item:bg-blue-400 transition-all duration-300 group-hover/item:scale-125" />
                    </div>
                  ))}
                </CardContent>
              </div>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Portfolio Widget</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full mb-4"
                  onClick={connectMetaMask}
                  disabled={connectingWallet}
                >
                  {walletAddress
                    ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                    : connectingWallet
                    ? "Connecting..."
                    : "Connect MetaMask"}
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

export default Explorer;
