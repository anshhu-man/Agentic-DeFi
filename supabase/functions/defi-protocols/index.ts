import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProtocolData {
  id: string;
  name: string;
  address?: string;
  symbol?: string;
  url?: string;
  description?: string;
  chain: string;
  logo?: string;
  audits?: number;
  audit_note?: string;
  gecko_id?: string;
  cmcId?: string;
  category: string;
  parent_protocol?: string;
  oracles?: string[];
  listedAt?: number;
  methodology?: string;
  module: string;
  twitter?: string;
  forkedFrom?: string[];
  slug: string;
  tvl: number;
  chainTvls?: Record<string, number>;
  change_1h?: number;
  change_1d?: number;
  change_7d?: number;
  tokenBreakdowns?: Record<string, number>;
  mcap?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category = 'Dexes', chain = null } = await req.json().catch(() => ({}));
    
    console.log('Fetching DeFi protocols for category:', category, 'chain:', chain);

    // DeFiLlama API call for protocols
    let url = 'https://api.llama.fi/protocols';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('DeFiLlama API error:', response.status, response.statusText);
      throw new Error(`DeFiLlama API error: ${response.status}`);
    }

    const protocols: ProtocolData[] = await response.json();
    
    // Filter by category and chain if specified
    let filteredProtocols = protocols;
    
    if (category && category !== 'all') {
      filteredProtocols = filteredProtocols.filter(protocol => 
        protocol.category?.toLowerCase() === category.toLowerCase()
      );
    }
    
    if (chain) {
      filteredProtocols = filteredProtocols.filter(protocol => 
        protocol.chain?.toLowerCase() === chain.toLowerCase() ||
        protocol.chainTvls?.[chain] > 0
      );
    }

    // Sort by TVL and take top 20
    const topProtocols = filteredProtocols
      .sort((a, b) => (b.tvl || 0) - (a.tvl || 0))
      .slice(0, 20)
      .map(protocol => ({
        id: protocol.id,
        name: protocol.name,
        slug: protocol.slug,
        category: protocol.category || 'Unknown',
        chain: protocol.chain || 'Multi-chain',
        tvl: protocol.tvl || 0,
        change1d: protocol.change_1d || 0,
        change7d: protocol.change_7d || 0,
        description: protocol.description,
        url: protocol.url,
        logo: protocol.logo,
        twitter: protocol.twitter,
        // Calculate estimated APY based on category (mock data for demo)
        estimatedApy: calculateEstimatedApy(protocol.category, protocol.tvl),
        risk: calculateRiskLevel(protocol.category, protocol.audits),
      }));

    console.log('Successfully fetched', topProtocols.length, 'protocols');

    return new Response(JSON.stringify({
      success: true,
      data: topProtocols,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in defi-protocols function:', error);
    
    // Return fallback data on error
    const fallbackData = [
      {
        id: 'uniswap-v3',
        name: 'Uniswap V3',
        slug: 'uniswap',
        category: 'Dexes',
        chain: 'Ethereum',
        tvl: 4200000000,
        change1d: 2.3,
        change7d: 8.7,
        estimatedApy: 12.4,
        risk: 'Low',
        description: 'Decentralized trading protocol',
        url: 'https://uniswap.org',
      },
      {
        id: '1inch',
        name: '1inch',
        slug: '1inch',
        category: 'Dexes',
        chain: 'Multi-chain',
        tvl: 890000000,
        change1d: 1.2,
        change7d: 5.4,
        estimatedApy: 8.7,
        risk: 'Medium',
        description: 'DEX aggregator',
        url: 'https://1inch.io',
      },
      {
        id: 'rootstock-defi',
        name: 'Rootstock DeFi',
        slug: 'rootstock',
        category: 'Lending',
        chain: 'Rootstock',
        tvl: 1100000000,
        change1d: 3.1,
        change7d: 12.1,
        estimatedApy: 15.2,
        risk: 'Medium',
        description: 'Bitcoin-secured DeFi protocol',
        url: 'https://rootstock.io',
      },
    ];

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      data: fallbackData,
      timestamp: new Date().toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateEstimatedApy(category?: string, tvl?: number): number {
  // Mock APY calculation based on category
  const baseApy = {
    'Dexes': 8,
    'Lending': 12,
    'Yield': 18,
    'Derivatives': 15,
    'Assets': 6,
    'Payments': 4,
    'Liquid Staking': 10,
  };
  
  const base = baseApy[category as keyof typeof baseApy] || 8;
  const tvlMultiplier = tvl ? Math.max(0.5, Math.min(2, (2000000000 - tvl) / 1000000000)) : 1;
  
  return Math.round((base * tvlMultiplier + Math.random() * 5) * 10) / 10;
}

function calculateRiskLevel(category?: string, audits?: number): string {
  const highRiskCategories = ['Derivatives', 'Yield', 'Liquid Staking'];
  const lowRiskCategories = ['Assets', 'Payments'];
  
  if (audits && audits > 3) return 'Low';
  if (lowRiskCategories.includes(category || '')) return 'Low';
  if (highRiskCategories.includes(category || '')) return 'High';
  
  return 'Medium';
}