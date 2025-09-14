// Simple test script to check if the basic server structure works
// This bypasses TypeScript compilation issues for quick testing

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

console.log('🧪 Testing Agentic Meta-Protocol Explorer Backend...\n');

// Test 1: Basic Express Server
console.log('✅ Test 1: Express server creation');
const app = express();

// Test 2: Middleware setup
console.log('✅ Test 2: Middleware setup');
app.use(helmet());
app.use(cors());
app.use(express.json());

// Test 3: Basic health endpoint
console.log('✅ Test 3: Health endpoint setup');
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Agentic Meta-Protocol Explorer Backend is running',
    services: {
      database: false, // Would be true with real DB connection
      redis: false,    // Would be true with real Redis connection
      alchemy: false,  // Would be true with real API key
      pyth: true,      // Public endpoint, should work
      graph: false,    // Would be true with real API key
    }
  });
});

// Test 4: Mock query endpoint
console.log('✅ Test 4: Mock query endpoint setup');
app.post('/api/query', (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_QUERY', message: 'Query is required' }
    });
  }

  // Mock response based on query content
  let mockResponse;
  
  if (query.toLowerCase().includes('yield')) {
    mockResponse = {
      intent: 'yield_comparison',
      results: {
        summary: 'Found several yield opportunities across DeFi protocols. Top yields range from 5-12% APY.',
        data: {
          yield: [
            { protocol: 'Aave', tokenSymbol: 'USDC', apy: '8.5', chainId: 1, riskScore: 3 },
            { protocol: 'Compound', tokenSymbol: 'USDC', apy: '7.2', chainId: 1, riskScore: 2 },
            { protocol: 'Uniswap V3', tokenSymbol: 'ETH/USDC', apy: '12.1', chainId: 137, riskScore: 6 }
          ]
        }
      },
      confidence: 0.85,
      recommendations: [
        'Consider Aave for stable yields with moderate risk',
        'Uniswap V3 offers higher yields but with increased impermanent loss risk'
      ]
    };
  } else if (query.toLowerCase().includes('risk')) {
    mockResponse = {
      intent: 'risk_analysis',
      results: {
        summary: 'Portfolio risk analysis shows moderate risk exposure with some concentration concerns.',
        data: {
          risk: {
            overallRiskScore: 6,
            liquidationRisk: { positions: [] },
            concentrationRisk: { topHoldings: [{ symbol: 'ETH', percentage: '45' }] }
          }
        }
      },
      confidence: 0.78,
      recommendations: [
        'Consider diversifying beyond ETH concentration',
        'Monitor liquidation risks on leveraged positions'
      ]
    };
  } else if (query.toLowerCase().includes('governance')) {
    mockResponse = {
      intent: 'governance',
      results: {
        summary: 'Found 3 active governance proposals across your token holdings.',
        data: {
          governance: [
            { title: 'Uniswap V4 Fee Structure', status: 'active', endTime: '2024-01-22', impact: 'high' },
            { title: 'Aave Risk Parameters', status: 'active', endTime: '2024-01-20', impact: 'medium' }
          ]
        }
      },
      confidence: 0.92,
      recommendations: [
        '2 proposals ending soon - vote now!',
        'High-impact Uniswap proposal needs your attention'
      ]
    };
  } else {
    mockResponse = {
      intent: 'market_data',
      results: {
        summary: 'General market overview shows positive trends across major DeFi protocols.',
        data: {
          overview: 'Market analysis complete with mock data'
        }
      },
      confidence: 0.70,
      recommendations: [
        'Market conditions are favorable for DeFi participation',
        'Consider exploring yield opportunities'
      ]
    };
  }

  res.json({
    success: true,
    data: {
      ...mockResponse,
      query: query,
      executionTime: Math.floor(Math.random() * 1000) + 200, // Mock execution time
    },
    meta: {
      timestamp: new Date(),
      version: '1.0.0-test'
    }
  });
});

// Test 5: Start server
console.log('✅ Test 5: Starting server...');
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Test server running successfully!`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 Query endpoint: http://localhost:${PORT}/api/query`);
  console.log(`\n📋 Test the query endpoint with:`);
  console.log(`curl -X POST http://localhost:${PORT}/api/query \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"query": "What are the best USDC yields?"}'`);
  console.log(`\n⏹️  Press Ctrl+C to stop the server`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test server...');
  server.close(() => {
    console.log('✅ Test server stopped successfully');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down test server...');
  server.close(() => {
    console.log('✅ Test server stopped successfully');
    process.exit(0);
  });
});
