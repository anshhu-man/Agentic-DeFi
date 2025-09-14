const axios = require('axios');

// Test Pyth Pull Oracle Integration
async function testPythIntegration() {
  console.log('🚀 Testing Pyth Pull Oracle Integration\n');
  
  try {
    // Test 1: Enhanced Yield Agent - Find Optimal Yields
    console.log('📊 Test 1: Finding Optimal Yields with Pyth Confidence');
    const yieldResponse = await axios.post('http://localhost:3000/api/query', {
      query: "Find the best USDC yields on Ethereum and Polygon with high confidence",
      userAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      preferences: {
        riskTolerance: "medium",
        minConfidence: 75
      }
    });
    
    console.log('✅ Yield Analysis Result:');
    console.log(JSON.stringify(yieldResponse.data, null, 2));
    console.log('\n');
    
    // Test 2: Cross-Chain Arbitrage Detection
    console.log('🔄 Test 2: Cross-Chain Arbitrage Detection');
    const arbitrageResponse = await axios.post('http://localhost:3000/api/query', {
      query: "Detect arbitrage opportunities for ETH between Ethereum and Polygon",
      userAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      preferences: {
        tokens: ["ETH"],
        chains: [1, 137],
        minProfitBps: 50
      }
    });
    
    console.log('✅ Arbitrage Opportunities:');
    console.log(JSON.stringify(arbitrageResponse.data, null, 2));
    console.log('\n');
    
    // Test 3: Comprehensive Yield Analysis
    console.log('📈 Test 3: Comprehensive Yield Analysis');
    const comprehensiveResponse = await axios.post('http://localhost:3000/api/query', {
      query: "Provide comprehensive yield analysis for DeFi portfolio optimization",
      userAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      preferences: {
        tokens: ["ETH", "USDC", "USDT"],
        chains: [1, 137],
        amount: "10000"
      }
    });
    
    console.log('✅ Comprehensive Analysis:');
    console.log(JSON.stringify(comprehensiveResponse.data, null, 2));
    console.log('\n');
    
    // Test 4: Portfolio Optimization
    console.log('💼 Test 4: Portfolio Yield Optimization');
    const portfolioResponse = await axios.post('http://localhost:3000/api/query', {
      query: "Optimize my DeFi portfolio for better yields using Pyth price confidence",
      userAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      preferences: {
        currentPositions: [
          {
            token: "USDC",
            amount: "5000",
            currentAPY: 3.5,
            chainId: 1
          },
          {
            token: "ETH",
            amount: "2",
            currentAPY: 4.2,
            chainId: 137
          }
        ],
        riskTolerance: "medium"
      }
    });
    
    console.log('✅ Portfolio Optimization:');
    console.log(JSON.stringify(portfolioResponse.data, null, 2));
    console.log('\n');
    
    console.log('🎉 All Pyth Integration Tests Completed Successfully!');
    
  } catch (error) {
    console.error('❌ Test Failed:', error.response?.data || error.message);
  }
}

// Test Pyth Service Health
async function testPythServiceHealth() {
  console.log('🏥 Testing Pyth Service Health\n');
  
  try {
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ Service Health:', healthResponse.data);
    
    // Test specific Pyth endpoints
    console.log('\n📡 Testing Pyth Hermes API directly...');
    
    // Test Hermes API
    const hermesResponse = await axios.get('https://hermes.pyth.network/api/latest_price_feeds', {
      params: {
        ids: ['0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace'] // ETH/USD
      },
      timeout: 10000
    });
    
    console.log('✅ Hermes API Response:');
    console.log(JSON.stringify(hermesResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Health Check Failed:', error.message);
  }
}

// Main test execution
async function runTests() {
  console.log('🔥 PYTH NETWORK PULL ORACLE INTEGRATION TEST\n');
  console.log('=' .repeat(60));
  
  // Test service health first
  await testPythServiceHealth();
  
  console.log('\n' + '=' .repeat(60));
  
  // Test integration
  await testPythIntegration();
  
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 Test Suite Complete!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testPythIntegration,
  testPythServiceHealth,
  runTests
};
