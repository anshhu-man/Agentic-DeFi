// Enhanced DeFi Test Server for End-to-End Testing
// This simulates the full AI agent pipeline with realistic DeFi responses

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

console.log('🚀 Starting Agentic Meta-Protocol Explorer - DeFi Test Server...\n');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock AI Query Parser
function parseQuery(query) {
  const lowerQuery = query.toLowerCase();
  
  // Intent classification
  let intent = 'market_data';
  if (lowerQuery.includes('yield') || lowerQuery.includes('apy') || lowerQuery.includes('earn')) {
    intent = 'yield_comparison';
  } else if (lowerQuery.includes('risk') || lowerQuery.includes('liquidation') || lowerQuery.includes('safe')) {
    intent = 'risk_analysis';
  } else if (lowerQuery.includes('governance') || lowerQuery.includes('proposal') || lowerQuery.includes('vote')) {
    intent = 'governance';
  } else if (lowerQuery.includes('portfolio') || lowerQuery.includes('balance')) {
    intent = 'portfolio';
  }

  // Entity extraction
  const entities = {
    tokens: [],
    chains: [],
    protocols: [],
    timeframe: '24h'
  };

  // Extract tokens
  const tokenPatterns = ['usdc', 'eth', 'btc', 'dai', 'usdt', 'weth', 'wbtc'];
  tokenPatterns.forEach(token => {
    if (lowerQuery.includes(token)) {
      entities.tokens.push(token.toUpperCase());
    }
  });

  // Extract chains
  const chainPatterns = ['ethereum', 'polygon', 'rootstock', 'arbitrum', 'optimism'];
  chainPatterns.forEach(chain => {
    if (lowerQuery.includes(chain)) {
      entities.chains.push(chain);
    }
  });

  // Extract protocols
  const protocolPatterns = ['uniswap', 'aave', 'compound', 'sushiswap', 'curve'];
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

// Mock Agent Responses
function generateYieldResponse(entities) {
  const mockYields = [
    {
      protocol: 'Aave V3',
      tokenSymbol: entities.tokens[0] || 'USDC',
      apy: '8.45',
      chainId: 1,
      chainName: 'Ethereum',
      tvl: '$2.1B',
      riskScore: 3,
      category: 'lending',
      liquidity: 'High'
    },
    {
      protocol: 'Compound V3',
      tokenSymbol: entities.tokens[0] || 'USDC',
      apy: '7.82',
      chainId: 137,
      chainName: 'Polygon',
      tvl: '$890M',
      riskScore: 2,
      category: 'lending',
      liquidity: 'High'
    },
    {
      protocol: 'Uniswap V3',
      tokenSymbol: `${entities.tokens[0] || 'ETH'}/USDC`,
      apy: '12.34',
      chainId: 1,
      chainName: 'Ethereum',
      tvl: '$1.5B',
      riskScore: 6,
      category: 'liquidity_pool',
      liquidity: 'Very High',
      impermanentLossRisk: 'Medium'
    },
    {
      protocol: 'Curve Finance',
      tokenSymbol: '3Pool',
      apy: '5.67',
      chainId: 1,
      chainName: 'Ethereum',
      tvl: '$3.2B',
      riskScore: 4,
      category: 'liquidity_pool',
      liquidity: 'Very High'
    }
  ];

  // Filter by chains if specified
  if (entities.chains.length > 0) {
    return mockYields.filter(yield => 
      entities.chains.some(chain => yield.chainName.toLowerCase().includes(chain))
    );
  }

  return mockYields;
}

function generateRiskResponse(entities) {
  return {
    overallRiskScore: 6.2,
    liquidationRisk: {
      positions: [
        {
          protocol: 'Aave V3',
          asset: 'ETH',
          healthFactor: '1.85',
          liquidationPrice: '$2,850',
          timeToLiquidation: '3 days at current volatility',
          severity: 'medium'
        },
        {
          protocol: 'Compound',
          asset: 'WBTC',
          healthFactor: '2.1',
          liquidationPrice: '$45,200',
          severity: 'low'
        }
      ]
    },
    concentrationRisk: {
      topHoldings: [
        { symbol: 'ETH', percentage: '42.5', riskLevel: 'medium' },
        { symbol: 'USDC', percentage: '28.3', riskLevel: 'low' },
        { symbol: 'WBTC', percentage: '15.7', riskLevel: 'medium' }
      ],
      diversificationScore: 6.8
    },
    impermanentLossRisk: {
      lpPositions: [
        {
          protocol: 'Uniswap V3',
          pair: 'ETH/USDC',
          currentIL: '2.8%',
          projectedIL: '5.4%',
          severity: 'medium'
        }
      ]
    },
    recommendations: [
      'Consider reducing ETH concentration below 40%',
      'Monitor liquidation risk on Aave position',
      'Diversify into more stable assets',
      'Set up liquidation alerts for health factor < 1.5'
    ]
  };
}

function generateGovernanceResponse(entities) {
  return [
    {
      id: 'uniswap-v4-001',
      title: 'Uniswap V4 Hook Implementation Standards',
      daoName: 'Uniswap DAO',
      description: 'Proposal to establish standardized hook implementation guidelines for Uniswap V4 to ensure security and interoperability.',
      status: 'active',
      startTime: '2024-01-15T00:00:00Z',
      endTime: '2024-01-22T23:59:59Z',
      votesFor: '18,500,000 UNI',
      votesAgainst: '2,100,000 UNI',
      quorum: '40,000,000 UNI',
      currentQuorum: '52.3%',
      userVotingPower: '1,250 UNI',
      userHasVoted: false,
      impact: 'high',
      timeRemaining: '2 days 14 hours',
      urgency: 'high'
    },
    {
      id: 'aave-risk-001',
      title: 'AAVE V3 Risk Parameter Updates - USDC/USDT',
      daoName: 'Aave DAO',
      description: 'Proposal to adjust loan-to-value ratios and liquidation thresholds for USDC and USDT on Ethereum mainnet.',
      status: 'active',
      startTime: '2024-01-12T00:00:00Z',
      endTime: '2024-01-19T23:59:59Z',
      votesFor: '12,800,000 AAVE',
      votesAgainst: '1,500,000 AAVE',
      quorum: '20,000,000 AAVE',
      currentQuorum: '71.5%',
      userVotingPower: '850 AAVE',
      userHasVoted: false,
      impact: 'medium',
      timeRemaining: '5 hours',
      urgency: 'critical'
    },
    {
      id: 'compound-treasury-001',
      title: 'Compound Treasury Diversification Strategy',
      daoName: 'Compound DAO',
      description: 'Proposal to diversify 30% of treasury funds into yield-generating DeFi protocols and real-world assets.',
      status: 'pending',
      startTime: '2024-01-25T00:00:00Z',
      endTime: '2024-02-01T23:59:59Z',
      votesFor: '0 COMP',
      votesAgainst: '0 COMP',
      quorum: '25,000,000 COMP',
      userVotingPower: '420 COMP',
      userHasVoted: false,
      impact: 'high',
      timeRemaining: '14 days',
      urgency: 'low'
    }
  ];
}

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Agentic Meta-Protocol Explorer - DeFi Test Server',
    version: '1.0.0-test',
    services: {
      queryParser: true,
      yieldAgent: true,
      riskAgent: true,
      governanceAgent: true,
      responseSynthesizer: true,
      aiModel: 'gpt-5 (simulated)',
    }
  });
});

// Main DeFi query endpoint
app.post('/api/query', (req, res) => {
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

  // Step 2: Route to appropriate agents and generate responses
  let agentResults = [];
  let primaryData = null;

  switch (parsedQuery.intent) {
    case 'yield_comparison':
      primaryData = generateYieldResponse(parsedQuery.entities);
      agentResults.push({
        agentType: 'yield',
        success: true,
        data: primaryData,
        confidence: 0.92,
        executionTime: 450
      });
      console.log(`💰 Yield Agent: Found ${primaryData.length} opportunities`);
      break;

    case 'risk_analysis':
      primaryData = generateRiskResponse(parsedQuery.entities);
      agentResults.push({
        agentType: 'risk',
        success: true,
        data: primaryData,
        confidence: 0.88,
        executionTime: 380
      });
      console.log(`⚠️  Risk Agent: Overall risk score ${primaryData.overallRiskScore}/10`);
      break;

    case 'governance':
      primaryData = generateGovernanceResponse(parsedQuery.entities);
      agentResults.push({
        agentType: 'governance',
        success: true,
        data: primaryData,
        confidence: 0.95,
        executionTime: 320
      });
      console.log(`🗳️  Governance Agent: Found ${primaryData.length} proposals`);
      break;

    case 'portfolio':
      // Multi-agent response
      const yieldData = generateYieldResponse(parsedQuery.entities);
      const riskData = generateRiskResponse(parsedQuery.entities);
      
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
      console.log(`📈 Portfolio Analysis: Yield + Risk agents executed`);
      break;

    default:
      primaryData = generateYieldResponse(parsedQuery.entities);
      agentResults.push({
        agentType: 'yield',
        success: true,
        data: primaryData,
        confidence: 0.75,
        executionTime: 400
      });
      console.log(`📊 Market Data: Default to yield analysis`);
  }

  // Step 3: Generate AI summary
  let summary = '';
  let recommendations = [];

  switch (parsedQuery.intent) {
    case 'yield_comparison':
      summary = `Found ${primaryData.length} yield opportunities with APYs ranging from ${Math.min(...primaryData.map(y => parseFloat(y.apy)))}% to ${Math.max(...primaryData.map(y => parseFloat(y.apy)))}%. Top opportunity is ${primaryData[0].protocol} offering ${primaryData[0].apy}% APY.`;
      recommendations = [
        `${primaryData[0].protocol} offers the highest yield at ${primaryData[0].apy}% APY`,
        'Consider risk levels when choosing protocols',
        'Diversify across multiple chains for better risk management'
      ];
      break;

    case 'risk_analysis':
      summary = `Portfolio risk analysis shows an overall risk score of ${primaryData.overallRiskScore}/10. ${primaryData.liquidationRisk.positions.length} position(s) require monitoring for liquidation risk.`;
      recommendations = primaryData.recommendations;
      break;

    case 'governance':
      const urgentProposals = primaryData.filter(p => p.urgency === 'critical' || p.urgency === 'high');
      summary = `Found ${primaryData.length} governance proposals across major DAOs. ${urgentProposals.length} proposal(s) have upcoming deadlines requiring immediate attention.`;
      recommendations = [
        `${urgentProposals.length} proposals ending soon - vote now!`,
        'Stay informed on protocol governance decisions',
        'Consider delegating voting power if unable to participate actively'
      ];
      break;

    default:
      summary = 'DeFi market analysis completed with comprehensive data across protocols and chains.';
      recommendations = ['Explore yield opportunities', 'Monitor risk levels', 'Stay updated on governance'];
  }

  const executionTime = Date.now() - startTime;

  // Step 4: Build unified response
  const response = {
    success: true,
    data: {
      query,
      intent: parsedQuery.intent,
      results: {
        summary,
        data: primaryData,
        visualizations: [], // Would contain chart configs
        actions: [], // Would contain actionable buttons
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
      version: '1.0.0-defi-test',
      aiModel: 'gpt-5-simulated'
    }
  };

  console.log(`✅ Response generated in ${executionTime}ms`);
  console.log(`📝 Summary: ${summary.substring(0, 100)}...`);

  res.json(response);
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 DeFi Test Server running on port ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`📍 Query: http://localhost:${PORT}/api/query`);
  
  console.log(`\n🧪 Test with these DeFi queries:`);
  console.log(`\n💰 Yield Analysis:`);
  console.log(`curl -X POST http://localhost:${PORT}/api/query -H "Content-Type: application/json" -d '{"query": "What are the best USDC yields on Polygon vs Ethereum?"}'`);
  
  console.log(`\n⚠️  Risk Analysis:`);
  console.log(`curl -X POST http://localhost:${PORT}/api/query -H "Content-Type: application/json" -d '{"query": "Analyze my DeFi portfolio risk and liquidation threats"}'`);
  
  console.log(`\n🗳️  Governance:`);
  console.log(`curl -X POST http://localhost:${PORT}/api/query -H "Content-Type: application/json" -d '{"query": "Show me active Uniswap governance proposals ending this week"}'`);
  
  console.log(`\n📈 Portfolio:`);
  console.log(`curl -X POST http://localhost:${PORT}/api/query -H "Content-Type: application/json" -d '{"query": "Optimize my portfolio for better yields and lower risk"}'`);
  
  console.log(`\n⏹️  Press Ctrl+C to stop`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down DeFi test server...');
  server.close(() => {
    console.log('✅ Server stopped successfully');
    process.exit(0);
  });
});
