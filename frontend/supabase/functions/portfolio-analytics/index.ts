import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface PortfolioMetrics {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalPnL: number;
  totalPnLPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  valueAtRisk: number;
  portfolioBeta: number;
  diversificationScore: number;
  riskScore: number;
}

interface AssetAllocation {
  asset: string;
  value: number;
  allocation: number;
  risk: 'Low' | 'Medium' | 'High';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, action = 'calculate_metrics' } = await req.json();
    
    if (!user_id) {
      throw new Error('User ID is required');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Processing portfolio analytics for user:', user_id);

    switch (action) {
      case 'calculate_metrics':
        return await calculatePortfolioMetrics(supabase, user_id);
      
      case 'get_allocation':
        return await getAssetAllocation(supabase, user_id);
      
      case 'risk_analysis':
        return await performRiskAnalysis(supabase, user_id);
      
      case 'performance_history':
        return await getPerformanceHistory(supabase, user_id);
      
      default:
        throw new Error('Invalid action specified');
    }

  } catch (error) {
    console.error('Error in portfolio-analytics function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function calculatePortfolioMetrics(supabase: any, user_id: string): Promise<Response> {
  // Fetch user's holdings and positions
  const [holdingsResult, positionsResult] = await Promise.all([
    supabase.from('user_holdings').select('*').eq('user_id', user_id),
    supabase.from('defi_positions').select('*').eq('user_id', user_id),
  ]);

  if (holdingsResult.error) throw new Error(holdingsResult.error.message);
  if (positionsResult.error) throw new Error(positionsResult.error.message);

  const holdings = holdingsResult.data || [];
  const positions = positionsResult.data || [];

  // Calculate total portfolio value
  const holdingsValue = holdings.reduce((sum: number, h: any) => sum + h.current_value_usd, 0);
  const positionsValue = positions.reduce((sum: number, p: any) => sum + p.position_value_usd, 0);
  const totalValue = holdingsValue + positionsValue;

  // Calculate metrics (simplified calculations for demo)
  const metrics: PortfolioMetrics = {
    totalValue,
    dayChange: totalValue * (Math.random() * 0.1 - 0.05), // ±5% random change
    dayChangePercent: (Math.random() * 10 - 5), // ±5%
    totalPnL: totalValue * 0.15, // Assume 15% total gain
    totalPnLPercent: 15,
    sharpeRatio: calculateSharpeRatio(holdings, positions),
    maxDrawdown: calculateMaxDrawdown(totalValue),
    valueAtRisk: totalValue * 0.05, // 5% VaR
    portfolioBeta: calculatePortfolioBeta(holdings),
    diversificationScore: calculateDiversificationScore(holdings),
    riskScore: calculateRiskScore(holdings, positions),
  };

  console.log('Calculated portfolio metrics for user:', user_id);

  return new Response(JSON.stringify({
    success: true,
    metrics,
    timestamp: new Date().toISOString(),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getAssetAllocation(supabase: any, user_id: string): Promise<Response> {
  const { data: holdings, error } = await supabase
    .from('user_holdings')
    .select('*')
    .eq('user_id', user_id);

  if (error) throw new Error(error.message);

  const totalValue = holdings.reduce((sum: number, h: any) => sum + h.current_value_usd, 0);
  
  const allocation: AssetAllocation[] = holdings.map((holding: any) => ({
    asset: holding.asset_symbol,
    value: holding.current_value_usd,
    allocation: totalValue > 0 ? (holding.current_value_usd / totalValue) * 100 : 0,
    risk: getAssetRisk(holding.asset_symbol),
  }));

  return new Response(JSON.stringify({
    success: true,
    allocation,
    totalValue,
    timestamp: new Date().toISOString(),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function performRiskAnalysis(supabase: any, user_id: string): Promise<Response> {
  const [holdingsResult, positionsResult] = await Promise.all([
    supabase.from('user_holdings').select('*').eq('user_id', user_id),
    supabase.from('defi_positions').select('*').eq('user_id', user_id),
  ]);

  const holdings = holdingsResult.data || [];
  const positions = positionsResult.data || [];

  // Risk analysis
  const riskAnalysis = {
    overallRisk: calculateRiskScore(holdings, positions),
    concentrationRisk: calculateConcentrationRisk(holdings),
    protocolRisk: calculateProtocolRisk(positions),
    liquidityRisk: calculateLiquidityRisk(holdings),
    recommendations: generateRiskRecommendations(holdings, positions),
  };

  return new Response(JSON.stringify({
    success: true,
    riskAnalysis,
    timestamp: new Date().toISOString(),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getPerformanceHistory(supabase: any, user_id: string): Promise<Response> {
  // Generate mock historical performance data
  // In a real implementation, this would fetch actual historical data
  const performanceData = [];
  const startValue = 10000;
  
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (30 - i));
    
    const dailyReturn = (Math.random() - 0.5) * 0.1; // ±5% daily variance
    const cumulativeReturn = Math.pow(1.1, i / 30); // 10% monthly growth trend
    const value = startValue * cumulativeReturn * (1 + dailyReturn);
    
    performanceData.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value * 100) / 100,
      dailyReturn: Math.round(dailyReturn * 10000) / 100, // basis points to percentage
    });
  }

  return new Response(JSON.stringify({
    success: true,
    performanceData,
    startDate: performanceData[0]?.date,
    endDate: performanceData[performanceData.length - 1]?.date,
    totalReturn: ((performanceData[performanceData.length - 1]?.value - startValue) / startValue) * 100,
    timestamp: new Date().toISOString(),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Helper functions
function calculateSharpeRatio(holdings: any[], positions: any[]): number {
  // Simplified Sharpe ratio calculation
  const avgReturn = 0.15; // 15% average return
  const riskFreeRate = 0.02; // 2% risk-free rate
  const volatility = 0.25; // 25% volatility
  
  return Math.round(((avgReturn - riskFreeRate) / volatility) * 100) / 100;
}

function calculateMaxDrawdown(totalValue: number): number {
  // Mock calculation - in reality, would use historical data
  return Math.round((totalValue * 0.124) * 100) / 100; // 12.4% max drawdown
}

function calculatePortfolioBeta(holdings: any[]): number {
  // Simplified beta calculation based on asset types
  let weightedBeta = 0;
  let totalWeight = 0;
  
  holdings.forEach((holding: any) => {
    const beta = getAssetBeta(holding.asset_symbol);
    const weight = holding.current_value_usd;
    weightedBeta += beta * weight;
    totalWeight += weight;
  });
  
  return totalWeight > 0 ? Math.round((weightedBeta / totalWeight) * 100) / 100 : 1.0;
}

function calculateDiversificationScore(holdings: any[]): number {
  if (holdings.length === 0) return 0;
  
  // Calculate Herfindahl index for concentration
  const totalValue = holdings.reduce((sum: number, h: any) => sum + h.current_value_usd, 0);
  let herfindahl = 0;
  
  holdings.forEach((holding: any) => {
    const share = holding.current_value_usd / totalValue;
    herfindahl += share * share;
  });
  
  // Convert to diversification score (inverse of concentration)
  const diversificationScore = (1 - herfindahl) * 100;
  return Math.round(diversificationScore * 100) / 100;
}

function calculateRiskScore(holdings: any[], positions: any[]): number {
  // Risk score based on asset allocation and protocol exposure
  let totalRisk = 0;
  let totalValue = 0;
  
  holdings.forEach((holding: any) => {
    const assetRisk = getAssetRiskScore(holding.asset_symbol);
    totalRisk += assetRisk * holding.current_value_usd;
    totalValue += holding.current_value_usd;
  });
  
  positions.forEach((position: any) => {
    const protocolRisk = getProtocolRiskScore(position.protocol_name);
    totalRisk += protocolRisk * position.position_value_usd;
    totalValue += position.position_value_usd;
  });
  
  return totalValue > 0 ? Math.round((totalRisk / totalValue) * 100) / 100 : 50;
}

function calculateConcentrationRisk(holdings: any[]): number {
  if (holdings.length === 0) return 0;
  
  const totalValue = holdings.reduce((sum: number, h: any) => sum + h.current_value_usd, 0);
  const maxHolding = Math.max(...holdings.map((h: any) => h.current_value_usd));
  
  return totalValue > 0 ? Math.round((maxHolding / totalValue) * 100 * 100) / 100 : 0;
}

function calculateProtocolRisk(positions: any[]): number {
  // Average protocol risk weighted by position size
  if (positions.length === 0) return 0;
  
  let weightedRisk = 0;
  let totalValue = 0;
  
  positions.forEach((position: any) => {
    const risk = getProtocolRiskScore(position.protocol_name);
    weightedRisk += risk * position.position_value_usd;
    totalValue += position.position_value_usd;
  });
  
  return totalValue > 0 ? Math.round((weightedRisk / totalValue) * 100) / 100 : 0;
}

function calculateLiquidityRisk(holdings: any[]): number {
  // Simplified liquidity risk based on asset types
  let liquidityScore = 0;
  let totalValue = 0;
  
  holdings.forEach((holding: any) => {
    const liquidity = getAssetLiquidity(holding.asset_symbol);
    liquidityScore += liquidity * holding.current_value_usd;
    totalValue += holding.current_value_usd;
  });
  
  return totalValue > 0 ? Math.round((liquidityScore / totalValue) * 100) / 100 : 50;
}

function generateRiskRecommendations(holdings: any[], positions: any[]): string[] {
  const recommendations = [];
  
  // Check concentration
  const concentrationRisk = calculateConcentrationRisk(holdings);
  if (concentrationRisk > 50) {
    recommendations.push("Consider diversifying - over 50% concentrated in single asset");
  }
  
  // Check protocol exposure
  if (positions.length > 0) {
    const protocolRisk = calculateProtocolRisk(positions);
    if (protocolRisk > 70) {
      recommendations.push("High protocol risk detected - consider reducing exposure");
    }
  }
  
  // Check stablecoin allocation
  const stablecoinRatio = holdings
    .filter((h: any) => ['USDC', 'USDT', 'DAI'].includes(h.asset_symbol))
    .reduce((sum: number, h: any) => sum + h.current_value_usd, 0) / 
    holdings.reduce((sum: number, h: any) => sum + h.current_value_usd, 1);
    
  if (stablecoinRatio < 0.1) {
    recommendations.push("Consider adding stablecoins for stability (currently < 10%)");
  }
  
  return recommendations;
}

// Asset risk mappings
function getAssetRisk(symbol: string): 'Low' | 'Medium' | 'High' {
  const lowRisk = ['USDC', 'USDT', 'DAI', 'BTC', 'ETH'];
  const highRisk = ['DOGE', 'SHIB', 'PEPE'];
  
  if (lowRisk.includes(symbol)) return 'Low';
  if (highRisk.includes(symbol)) return 'High';
  return 'Medium';
}

function getAssetBeta(symbol: string): number {
  const betas: Record<string, number> = {
    'BTC': 1.0,
    'ETH': 1.2,
    'USDC': 0.1,
    'USDT': 0.1,
    'UNI': 1.5,
    'RBTC': 1.1,
  };
  return betas[symbol] || 1.0;
}

function getAssetRiskScore(symbol: string): number {
  const riskScores: Record<string, number> = {
    'BTC': 30,
    'ETH': 35,
    'USDC': 10,
    'USDT': 15,
    'UNI': 60,
    'RBTC': 40,
  };
  return riskScores[symbol] || 50;
}

function getProtocolRiskScore(protocol: string): number {
  const protocolRisks: Record<string, number> = {
    'Uniswap V3': 25,
    '1inch Limit Orders': 30,
    'Rootstock Bridge': 35,
    'Compound': 20,
    'Aave': 22,
  };
  return protocolRisks[protocol] || 40;
}

function getAssetLiquidity(symbol: string): number {
  const liquidityScores: Record<string, number> = {
    'BTC': 95,
    'ETH': 95,
    'USDC': 98,
    'USDT': 97,
    'UNI': 80,
    'RBTC': 70,
  };
  return liquidityScores[symbol] || 60;
}