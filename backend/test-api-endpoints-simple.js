// Simple API Endpoint Test Script
// Tests the Analyze-Only API endpoints without database dependencies

require('dotenv').config();
const axios = require('axios');
const https = require('https');

// Configuration
const CONFIG = {
  server: {
    port: process.env.PORT || 3000,
    host: 'localhost',
  },
  test: {
    timeout: 30000,
  }
};

// Create axios instance with SSL bypass
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  }),
  timeout: CONFIG.test.timeout
});

// Test Logger
class TestLogger {
  static info(message, data = null) {
    console.log(`ℹ️  ${message}${data ? '\n   ' + JSON.stringify(data, null, 2) : ''}`);
  }

  static success(message, data = null) {
    console.log(`✅ ${message}${data ? '\n   ' + JSON.stringify(data, null, 2) : ''}`);
  }

  static error(message, error = null) {
    console.log(`❌ ${message}${error ? '\n   ' + (error.message || error) : ''}`);
  }

  static section(title) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 ${title}`);
    console.log(`${'='.repeat(60)}`);
  }
}

// Test Functions
async function testServerHealth() {
  TestLogger.section('Testing Server Health');

  try {
    // Try different health endpoints
    const healthEndpoints = [
      '/health',
      '/api/health',
      '/'
    ];

    for (const endpoint of healthEndpoints) {
      try {
        const response = await axiosInstance.get(
          `http://${CONFIG.server.host}:${CONFIG.server.port}${endpoint}`
        );

        if (response.status === 200) {
          TestLogger.success(`Server is healthy at ${endpoint}`);
          TestLogger.info('Health response', response.data);
          return true;
        }
      } catch (error) {
        TestLogger.info(`Endpoint ${endpoint} not available: ${error.message}`);
      }
    }

    TestLogger.error('No health endpoint responded successfully');
    return false;

  } catch (error) {
    TestLogger.error('Server health test failed', error);
    return false;
  }
}

async function testAnalyzeDebugEndpoint() {
  TestLogger.section('Testing Analyze Debug Endpoint');

  try {
    const response = await axiosInstance.get(
      `http://${CONFIG.server.host}:${CONFIG.server.port}/api/chat/analyze/debug`
    );

    if (response.status === 200 && response.data.success) {
      TestLogger.success('Debug endpoint working');
      TestLogger.info('System info', {
        status: response.data.data.status,
        mode: response.data.data.mode,
        availableAgents: response.data.data.availableAgents?.length,
        supportedIntents: response.data.data.supportedIntents?.length,
        capabilities: response.data.data.capabilities
      });
      return true;
    } else {
      TestLogger.error('Debug endpoint failed', response.data);
      return false;
    }

  } catch (error) {
    TestLogger.error('Debug endpoint test failed', error.response?.data || error.message);
    return false;
  }
}

async function testAnalyzeEndpoint() {
  TestLogger.section('Testing Analyze-Only Endpoint');

  const testCases = [
    {
      name: 'Basic ETH Price Query',
      payload: {
        message: "What's the current ETH price?",
        userId: "test-user-123"
      }
    },
    {
      name: 'Yield Optimization Query',
      payload: {
        message: "Find me safe yield opportunities for USDC",
        userId: "test-user-456",
        userProfile: {
          riskTolerance: "low",
          experienceLevel: "beginner",
          portfolioSize: "small",
          preferredChains: ["ethereum"],
          preferredProtocols: ["aave", "compound"]
        }
      }
    },
    {
      name: 'Risk Assessment Query',
      payload: {
        message: "What are the current DeFi market risks?",
        userId: "test-user-789",
        userProfile: {
          riskTolerance: "medium",
          experienceLevel: "intermediate"
        }
      }
    }
  ];

  let successCount = 0;

  for (const testCase of testCases) {
    try {
      TestLogger.info(`Running test: ${testCase.name}`);
      
      const response = await axiosInstance.post(
        `http://${CONFIG.server.host}:${CONFIG.server.port}/api/chat/analyze`,
        testCase.payload,
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.status === 200 && response.data.success) {
        TestLogger.success(`${testCase.name} - SUCCESS`);
        TestLogger.info('Response structure', {
          hasReply: !!response.data.data?.reply,
          hasAgentInsights: !!response.data.data?.agentInsights,
          executionTime: response.data.meta?.executionTime,
          agentsUsed: response.data.meta?.agentsUsed
        });
        successCount++;
      } else {
        TestLogger.error(`${testCase.name} - FAILED`, response.data);
      }

    } catch (error) {
      TestLogger.error(`${testCase.name} - ERROR`, error.response?.data || error.message);
    }

    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  TestLogger.info(`Analyze endpoint tests completed: ${successCount}/${testCases.length} passed`);
  return successCount === testCases.length;
}

async function testErrorHandling() {
  TestLogger.section('Testing Error Handling');

  try {
    // Test missing message field
    const response = await axiosInstance.post(
      `http://${CONFIG.server.host}:${CONFIG.server.port}/api/chat/analyze`,
      {
        userId: "test-user-error"
        // Missing message field
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    TestLogger.error('Should have failed but didn\'t', response.data);
    return false;
    
  } catch (error) {
    if (error.response?.status === 400) {
      TestLogger.success('Error handling works correctly (400 for missing message)');
      TestLogger.info('Error response', error.response.data);
      return true;
    } else {
      TestLogger.error('Unexpected error response', error.response?.data || error.message);
      return false;
    }
  }
}

async function testPythIntegration() {
  TestLogger.section('Testing Pyth Network Integration');

  try {
    // Test direct Pyth endpoint
    const pythEndpoint = process.env.PYTH_NETWORK_ENDPOINT || 'https://hermes.pyth.network';
    const ethPriceFeedId = '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace';
    
    const response = await axiosInstance.get(`${pythEndpoint}/api/latest_price_feeds`, {
      params: { ids: [ethPriceFeedId] }
    });

    if (response.status === 200 && response.data.length > 0) {
      const priceData = response.data[0];
      const price = Number(priceData.price.price) * Math.pow(10, priceData.price.expo);
      
      TestLogger.success('Pyth Network integration working');
      TestLogger.info('ETH Price Data', {
        price: price.toFixed(2),
        confidence: Number(priceData.price.conf) * Math.pow(10, priceData.price.expo),
        timestamp: new Date(priceData.price.publish_time * 1000).toISOString()
      });
      return true;
    } else {
      TestLogger.error('Pyth Network response invalid', response.data);
      return false;
    }

  } catch (error) {
    TestLogger.error('Pyth Network integration test failed', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Simple API Endpoint Tests');
  console.log(`📍 Testing server at: http://${CONFIG.server.host}:${CONFIG.server.port}`);
  console.log('');

  const results = {
    serverHealth: false,
    pythIntegration: false,
    debugEndpoint: false,
    analyzeEndpoint: false,
    errorHandling: false
  };

  // Run tests in sequence
  results.serverHealth = await testServerHealth();
  
  if (results.serverHealth) {
    results.pythIntegration = await testPythIntegration();
    results.debugEndpoint = await testAnalyzeDebugEndpoint();
    results.analyzeEndpoint = await testAnalyzeEndpoint();
    results.errorHandling = await testErrorHandling();
  } else {
    TestLogger.error('Server not healthy, skipping other tests');
  }

  // Generate summary
  TestLogger.section('Test Summary');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log(`
🎯 RESULTS:
   Total Tests: ${total}
   ✅ Passed: ${passed}
   ❌ Failed: ${total - passed}
   📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%

📋 DETAILED RESULTS:
   Server Health: ${results.serverHealth ? '✅' : '❌'}
   Pyth Integration: ${results.pythIntegration ? '✅' : '❌'}
   Debug Endpoint: ${results.debugEndpoint ? '✅' : '❌'}
   Analyze Endpoint: ${results.analyzeEndpoint ? '✅' : '❌'}
   Error Handling: ${results.errorHandling ? '✅' : '❌'}
`);

  if (passed === total) {
    TestLogger.success('🎉 ALL TESTS PASSED! Your Analyze-Only API is working correctly!');
  } else {
    TestLogger.error(`⚠️  ${total - passed} test(s) failed. Check the details above.`);
  }

  return results;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testServerHealth,
  testAnalyzeDebugEndpoint,
  testAnalyzeEndpoint,
  testErrorHandling,
  testPythIntegration,
  CONFIG
};
