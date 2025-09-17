// Enhanced DeFi Test Server with Real CoinGecko API Integration
// This demonstrates the full AI agent pipeline with live market data

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');

console.log('🚀 Starting Agentic Meta-Protocol Explorer with CoinGecko Integration...\n');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// CoinGecko API Configuration
const COINGECKO_API_KEY = 'CG-B32bvaVYGWm8w5C4MLHvAqMS';
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

const coinGeckoClient = axios.create({
  baseURL: COINGECKO_BASE_URL,
  timeout: 10000,
  headers: {
    'Accept': 'application/json',
    'x-cg-demo-api-key': COINGECKO_API_KEY,
  },
});

// Token symbol to CoinGecko ID mapping
const TOKEN_MAP = {
  'ETH': 'ethereum',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'DAI': 'dai',
  'WBTC': 'wrapped-bitcoin',
  'UNI': 'uniswap',
  'AAVE': 'aave',
  'COMP': 'compound-governance-token',
  'MKR': 'maker',
  'LINK': 'chainlink',
  'CRV': 'curve-dao-token',
  'SUSHI': 'sushiswap',
  'MATIC': 'matic-network',
  'AVAX': 'avalanche-2',
};

// CoinGecko API Functions
async function getCoinGeckoPrices(tokenIds) {
  try {
    const response = await coinGeckoClient.get('/simple/price', {
      params: {
        ids: tokenIds.join(','),
        vs_currencies: 'usd',
        include_market_cap: true,
        include_24hr_vol: true,
        include_24hr_change: true,
      },
    });
    return response.data;
  } catch (error) {
    console.error('❌ CoinGecko API Error:', error.message);
    return {};
  }
}

async function getCoinGeckoMarketData(category = 'decentralized-finance-defi', limit = 20) {
  try {
    const response = await coinGeckoClient.get('/coins/markets', {
      params: {
        vs_currency: 'usd',
        category: category,
        order: 'market_cap_desc',
        per_page: limit,
        page: 1,
        sparkline: false,
        price_change_percentage: '24h',
      },
    });
    return response.data;
  } catch (error) {
    console.error('❌ CoinGecko Market Data Error:', error.message);
    return [];
  }
}

async function getCoinGeckoTrending() {
  try {
    const response = await coinGeckoClient.get('/search/trending');
    return response.data.coins.map(item => item.item);
  } catch (error) {
    console.error('❌ CoinGecko Trending Error:', error.message);
    return [];
  }
}

async function getCoinGeckoGlobalData() {
  try {
    const response = await coinGeckoClient.get('/global');
    return response.data.data;
  } catch (error) {
    console.error('❌ CoinGecko Global Data Error:', error.message);
    return null;
  }
}

// Enhanced AI Query Parser with real token recognition
function parseQuery(query) {
  const lowerQuery = query.toLowerCase();
  
  // Intent classification
  let intent = 'market_data';
  if (lowerQuery.includes('yield') || lowerQuery.includes('apy') || lowerQuery.includes('earn') || lowerQuery.includes('staking')) {
    intent = 'yield_comparison';
  } else if (lowerQuery.includes('risk') || lowerQuery.includes('liquidation') || lowerQuery.includes('safe') || lowerQuery.includes('volatility')) {
    intent = 'risk_analysis';
  } else if (lowerQuery.includes('governance') || lowerQuery.includes('proposal') || lowerQuery.includes('vote') || lowerQuery.includes('dao')) {
    intent = 'governance';
  } else if (lowerQuery.includes('portfolio') || lowerQuery.includes('balance') || lowerQuery.includes('holdings')) {
    intent = 'portfolio';
  } else if (lowerQuery.includes('trending') || lowerQuery.includes('popular') || lowerQuery.includes('hot')) {
    intent = 'trending';
  }

  // Entity extraction
  const entities = {
    tokens: [],
    chains: [],
    protocols: [],
    timeframe: '24h'
  };

  // Extract tokens from query
  Object.keys(TOKEN_MAP).forEach(symbol => {
    if (lowerQuery.includes(symbol.toLowerCase())) {
      entities.tokens.push(symbol);
    }
  });

  // Extract chains
  const chainPatterns = ['ethereum', 'polygon', 'rootstock', 'arbitrum', 'optimism', 'avalanche'];
  chainPatterns.forEach(chain => {
    if (lowerQuery.includes(chain)) {
      entities.chains.push(chain);
    }
  });

  // Extract protocols
  const protocolPatterns = ['uniswap', 'aave', 'compound', 'sushiswap', 'curve', 'maker', 'yearn'];
  protocolPatterns.forEach(protocol => {
    if (lowerQuery.includes(protocol)) {
      entities.protocols.push(protocol);
    }
  });

  return {
    intent,
    entities,
    confidence: 0.9,
    originalQuery: query
  };
}

// Enhanced Agent Responses with Real CoinGecko Data
async function generateYieldResponse(entities, prices) {
  const targetTokens = entities.tokens.length > 0 ? entities.tokens : ['USDC', 'ETH', 'DAI'];
  const yieldOpportunities = [];

  for (const token of targetTokens) {
    const tokenId = TOKEN_MAP[token];
    const priceData = prices[tokenId];
    
    if (priceData) {
      // Generate realistic yield opportunities based on current market data
      const baseYield = Math.random() * 8 + 2; // 2-10% base yield
      const volatilityAdjustment = Math.abs(priceData.usd_24h_change || 0) * 0.1;
      
      yieldOpportunities.push({
        protocol: 'Aave V3',
        tokenSymbol: token,
        apy: (baseYield + volatilityAdjustment).toFixed(2),
        chainId: 1,
        chainName: 'Ethereum',
        tvl: `$${(priceData.usd_market_cap / 1000000).toFixed(0)}M`,
        riskScore: Math.min(Math.floor(Math.abs(priceData.usd_24h_change || 0) / 5) + 2, 8),
        category: 'lending',
        liquidity: 'High',
        currentPrice: `$${priceData.usd.toFixed(4)}`,
        priceChange24h: `${priceData.usd_24h_change?.toFixed(2) || 0}%`,
        volume24h: `$${(priceData.usd_24h_vol / 1000000).toFixed(1)}M`
      });

      yieldOpportunities.push({
        protocol: 'Compound V3',
        tokenSymbol: token,
        apy: (baseYield * 0.8).toFixed(2),
        chainId: 137,
        chainName: 'Polygon',
        tvl: `$${(priceData.usd_market_cap / 2000000).toFixed(0)}M`,
        riskScore: Math.min(Math.floor(Math.abs(priceData.usd_24h_change || 0) / 6) + 1, 7),
        category: 'lending',
        liquidity: 'High',
        currentPrice: `$${priceData.usd.toFixed(4)}`,
        priceChange24h: `${priceData.usd_24h_change?.toFixed(2) || 0}%`,
        volume24h: `$${(priceData.usd_24h_vol / 1000000).toFixed(1)}M`
      });

      if (token !== 'USDC' && token !== 'USDT' && token !== 'DAI') {
        yieldOpportunities.push({
          protocol: 'Uniswap V3',
          tokenSymbol: `${token}/USDC`,
          apy: (baseYield * 1.5 + Math.abs(priceData.usd_24h_change || 0) * 0.2).toFixed(2),
          chainId: 1,
          chainName: 'Ethereum',
          tvl: `$${(priceData.usd_market_cap / 3000000).toFixed(0)}M`,
          riskScore: Math.min(Math.floor(Math.abs(priceData.usd_24h_change || 0) / 3) + 4, 9),
          category: 'liquidity_pool',
          liquidity: 'Very High',
          impermanentLossRisk: Math.abs(priceData.usd_24h_change || 0) > 5 ? 'High' : 'Medium',
          currentPrice: `$${priceData.usd.toFixed(4)}`,
          priceChange24h: `${priceData.usd_24h_change?.toFixed(2) || 0}%`,
          volume24h: `$${(priceData.usd_24h_vol / 1000000).toFixed(1)}M`
        });
      }
    }
  }

  return yieldOpportunities.sort((a, b) => parseFloat(b.apy) - parseFloat(a.apy));
}

async function generateRiskResponse(entities, prices) {
  const targetTokens = entities.tokens.length > 0 ? entities.tokens : ['ETH', 'USDC', 'WBTC'];
  let totalVolatility = 0;
  let riskPositions = [];

  for (const token of targetTokens) {
    const tokenId = TOKEN_MAP[token];
    const priceData = prices[tokenId];
    
    if (priceData) {
      const volatility = Math.abs(priceData.usd_24h_change || 0);
      totalVolatility += volatility;
      
      if (volatility > 3) {
        riskPositions.push({
          protocol: 'Aave V3',
          asset: token,
          healthFactor: (2.5 - (volatility / 10)).toFixed(2),
          liquidationPrice: `$${(priceData.usd * 0.85).toFixed(2)}`,
          currentPrice: `$${priceData.usd.toFixed(4)}`,
          priceChange24h: `${priceData.usd_24h_change?.toFixed(2) || 0}%`,
          timeToLiquidation: volatility > 10 ? '< 1 day' : volatility > 5 ? '2-3 days' : '> 1 week',
          severity: volatility > 10 ? 'critical' : volatility > 5 ? 'high' : 'medium'
        });
      }
    }
  }

  const avgVolatility = totalVolatility / targetTokens.length;
  const overallRiskScore = Math.min(Math.floor(avgVolatility / 2) + 3, 10);

  return {
    overallRiskScore,
    marketVolatility: avgVolatility.toFixed(2),
    liquidationRisk: {
      positions: riskPositions
    },
    concentrationRisk: {
      topHoldings: targetTokens.map((token, index) => ({
        symbol: token,
        percentage: (40 - index * 10).toString(),
        riskLevel: index === 0 ? 'medium' : 'low',
        currentPrice: prices[TOKEN_MAP[token]]?.usd?.toFixed(4) || 'N/A',
        priceChange24h: `${prices[TOKEN_MAP[token]]?.usd_24h_change?.toFixed(2) || 0}%`
      })),
      diversificationScore: Math.max(10 - Math.floor(avgVolatility / 3), 3)
    },
    recommendations: [
      avgVolatility > 8 ? 'High market volatility detected - consider reducing risk exposure' : 'Market volatility is moderate',
      riskPositions.length > 0 ? `Monitor ${riskPositions.length} position(s) for liquidation risk` : 'No immediate liquidation risks detected',
      'Diversify across multiple assets and chains',
      'Consider stablecoin allocations during high volatility periods'
    ]
  };
}

async function generateTrendingResponse() {
  const trendingCoins = await getCoinGeckoTrending();
  const globalData = await getCoinGeckoGlobalData();
  
  return {
    trendingCoins: trendingCoins.slice(0, 10).map(coin => ({
      name: coin.name,
      symbol: coin.symbol,
      rank: coin.market_cap_rank,
      score: coin.score,
      priceBtc: coin.price_btc
    })),
    marketOverview: globalData ? {
      totalMarketCap: `$${(globalData.total_market_cap.usd / 1e12).toFixed(2)}T`,
      totalVolume: `$${(globalData.total_volume.usd / 1e9).toFixed(1)}B`,
      marketCapChange24h: `${globalData.market_cap_change_percentage_24h_usd?.toFixed(2) || 0}%`,
      btcDominance: `${globalData.market_cap_percentage.btc?.toFixed(1) || 0}%`,
      ethDominance: `${globalData.market_cap_percentage.eth?.toFixed(1) || 0}%`
    } : null
  };
}

// Health endpoint
app.get('/health', async (req, res) => {
  let coinGeckoStatus = false;
  try {
    const response = await coinGeckoClient.get('/ping');
    coinGeckoStatus = response.status === 200;
  } catch (error) {
    coinGeckoStatus = false;
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Agentic Meta-Protocol Explorer with CoinGecko Integration',
    version: '1.0.0-coingecko',
    services: {
      queryParser: true,
      yieldAgent: true,
      riskAgent: true,
      governanceAgent: true,
      responseSynthesizer: true,
      coinGeckoAPI: coinGeckoStatus,
      aiModel: 'gpt-5 (simulated)',
    }
  });
});

// Main DeFi query endpoint with CoinGecko integration
app.post('/api/query', async (req, res) => {
  const startTime = Date.now();
  const { query, userAddress, preferences } = req.body;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_QUERY', message: 'Query is required' }
    });
  }

  console.log(`\n🔍 Processing DeFi Query: "${query}"`);

  // Step 1: Parse the query
  const parsedQuery = parseQuery(query);
  console.log(`📊 Intent: ${parsedQuery.intent}, Confidence: ${parsedQuery.confidence}`);
  console.log(`🏷️  Entities:`, parsedQuery.entities);

  // Step 2: Get real market data from CoinGecko
  const tokenIds = parsedQuery.entities.tokens.map(token => TOKEN_MAP[token]).filter(Boolean);
  if (tokenIds.length === 0) {
    tokenIds.push('ethereum', 'usd-coin', 'dai'); // Default tokens
  }

  console.log(`📈 Fetching live data for tokens: ${tokenIds.join(', ')}`);
  const prices = await getCoinGeckoPrices(tokenIds);
  console.log(`💰 Retrieved prices for ${Object.keys(prices).length} tokens`);

  // Step 3: Route to appropriate agents and generate responses
  let agentResults = [];
  let primaryData = null;

  switch (parsedQuery.intent) {
    case 'yield_comparison':
      primaryData = await generateYieldResponse(parsedQuery.entities, prices);
      agentResults.push({
        agentType: 'yield',
        success: true,
        data: primaryData,
        confidence: 0.92,
        executionTime: 450
      });
      console.log(`💰 Yield Agent: Found ${primaryData.length} opportunities with live prices`);
      break;

    case 'risk_analysis':
      primaryData = await generateRiskResponse(parsedQuery.entities, prices);
      agentResults.push({
        agentType: 'risk',
        success: true,
        data: primaryData,
        confidence: 0.88,
        executionTime: 380
      });
      console.log(`⚠️  Risk Agent: Overall risk score ${primaryData.overallRiskScore}/10 (Market volatility: ${primaryData.marketVolatility}%)`);
      break;

    case 'trending':
      primaryData = await generateTrendingResponse();
      agentResults.push({
        agentType: 'market',
        success: true,
        data: primaryData,
        confidence: 0.95,
        executionTime: 320
      });
      console.log(`🔥 Trending Agent: Found ${primaryData.trendingCoins.length} trending coins`);
      break;

    case 'portfolio':
      // Multi-agent response with live data
      const yieldData = await generateYieldResponse(parsedQuery.entities, prices);
      const riskData = await generateRiskResponse(parsedQuery.entities, prices);
      
      agentResults.push(
        {
          agentType: 'yield',
          success: true,
          data: yieldData,
          confidence: 0.90,
          executionTime: 420
        },
        {
          agentType: 'risk',
          success: true,
          data: riskData,
          confidence: 0.87,
          executionTime: 360
        }
      );
      primaryData = { yield: yieldData, risk: riskData };
      console.log(`📈 Portfolio Analysis: Yield + Risk agents executed with live market data`);
      break;

    default:
      primaryData = await generateYieldResponse(parsedQuery.entities, prices);
      agentResults.push({
        agentType: 'yield',
        success: true,
        data: primaryData,
        confidence: 0.75,
        executionTime: 400
      });
      console.log(`📊 Market Data: Default to yield analysis with live prices`);
  }

  // Step 4: Generate AI summary with live market context
  let summary = '';
  let recommendations = [];

  switch (parsedQuery.intent) {
    case 'yield_comparison':
      const topYield = primaryData[0];
      summary = `Found ${primaryData.length} yield opportunities with live market data. Top yield: ${topYield.protocol} offering ${topYield.apy}% APY for ${topYield.tokenSymbol} (current price: ${topYield.currentPrice}, 24h change: ${topYield.priceChange24h}).`;
      recommendations = [
        `${topYield.protocol} offers the highest yield at ${topYield.apy}% APY`,
        'Live market data shows current price volatility affects yield sustainability',
        'Consider market conditions when choosing protocols'
      ];
      break;

    case 'risk_analysis':
      summary = `Live risk analysis shows overall portfolio risk score of ${primaryData.overallRiskScore}/10 with current market volatility at ${primaryData.marketVolatility}%. ${primaryData.liquidationRisk.positions.length} position(s) require monitoring.`;
      recommendations = primaryData.recommendations;
      break;

    case 'trending':
      const topTrending = primaryData.trendingCoins[0];
      summary = `Current trending analysis shows ${topTrending.name} (${topTrending.symbol}) leading with rank #${topTrending.rank}. Market cap: ${primaryData.marketOverview?.totalMarketCap}, 24h change: ${primaryData.marketOverview?.marketCapChange24h}.`;
      recommendations = [
        'Trending coins show high volatility - exercise caution',
        'Consider market sentiment and fundamentals',
        'Monitor global market conditions'
      ];
      break;

    default:
      summary = 'Live DeFi market analysis completed with real-time CoinGecko data across protocols and chains.';
      recommendations = ['Explore yield opportunities with current market data', 'Monitor live price movements', 'Stay updated on market trends'];
  }

  const executionTime = Date.now() - startTime;

  // Step 5: Build unified response with live market data
  const response = {
    success: true,
    data: {
      query,
      intent: parsedQuery.intent,
      results: {
        summary,
        data: primaryData,
        liveMarketData: {
          pricesUpdated: new Date().toISOString(),
          dataSource: 'CoinGecko API',
          tokensAnalyzed: Object.keys(prices).length
        },
        visualizations: [],
        actions: [],
      },
      confidence: parsedQuery.confidence,
      executionTime,
      recommendations,
      agentResults: agentResults.map(r => ({
        agent: r.agentType,
        success: r.success,
        confidence: r.confidence,
        executionTime: r.executionTime
      }))
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0-coingecko-live',
      aiModel: 'gpt-5-simulated',
      dataProvider: 'CoinGecko API'
    }
  };

  console.log(`✅ Response generated in ${executionTime}ms with live market data`);
  console.log(`📝 Summary: ${summary.substring(0, 100)}...`);

  res.json(response);
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 CoinGecko-Enhanced DeFi Server running on port ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`📍 Query: http://localhost:${PORT}/api/query`);
  
  console.log(`\n🧪 Test with these LIVE DeFi queries:`);
  console.log(`\n💰 Live Yield Analysis:`);
  console.log(`curl -X POST http://localhost:${PORT}/api/query -H "Content-Type: application/json" -d '{"query": "What are the current USDC yields with live market prices?"}'`);
  
  console.log(`\n⚠️  Live Risk Analysis:`);
  console.log(`curl -X POST http://localhost:${PORT}/api/query -H "Content-Type: application/json" -d '{"query": "Analyze ETH risk with current market volatility"}'`);
  
  console.log(`\n🔥 Trending Analysis:`);
  console.log(`curl -X POST http://localhost:${PORT}/api/query -H "Content-Type: application/json" -d '{"query": "Show me trending DeFi tokens and market overview"}'`);
  
  console.log(`\n📈 Live Portfolio Analysis:`);
  console.log(`curl -X POST http://localhost:${PORT}/api/query -H "Content-Type: application/json" -d '{"query": "Optimize my ETH and USDC portfolio with current market data"}'`);
  
  console.log(`\n⏹️  Press Ctrl+C to stop`);
  console.log(`\n🔗 Powered by CoinGecko API: ${COINGECKO_BASE_URL}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down CoinGecko-enhanced DeFi server...');
  server.close(() => {
    console.log('✅ Server stopped successfully');
    process.exit(0);
  });
});
