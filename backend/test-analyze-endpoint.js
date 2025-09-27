// Test Script for New Analyze-Only Endpoint
// Tests the dedicated /api/chat/analyze endpoint

require('dotenv').config();
const axios = require('axios');
const https = require('https');

// Configuration
const CONFIG = {
  server: {
    port: process.env.PORT || 3001,
    host: 'localhost',
  },
  test: {
    timeout: 60000,
  }
};

// Create axios instance
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
async function testAnalyzeEndpoint() {
  TestLogger.section('Testing New Analyze-Only Endpoint');

  try {
    // Test 1: Basic functionality
    TestLogger.info('Test 1: Basic analyze request');
    const response1 = await axiosInstance.post(
      `http://${CONFIG.server.host}:${CONFIG.server.port}/api/chat/analyze`,
      {
        message: "What's the current ETH price and market sentiment?",
        userId: "test-user-123"
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (response1.status === 200 && response1.data.success) {
      TestLogger.success('Basic analyze request successful');
      TestLogger.info('Response structure', {
        hasReply: !!response1.data.data?.reply,
        hasAgentInsights: !!response1.data.data?.agentInsights,
        executionTime: response1.data.meta?.executionTime,
        agentsUsed: response1.data.meta?.agentsUsed
      });
    } else {
      TestLogger.error('Basic analyze request failed', response1.data);
    }

    // Test 2: With user profile
    TestLogger.info('Test 2: Analyze request with user profile');
    const response2 = await axiosInstance.post(
      `http://${CONFIG.server.host}:${CONFIG.server.port}/api/chat/analyze`,
      {
        message: "Find me safe yield opportunities for USDC",
        userId: "test-user-456",
        userProfile: {
          riskTolerance: "low",
          experienceLevel: "beginner",
          portfolioSize: "small",
          preferredChains: ["ethereum"],
          preferredProtocols: ["aave", "compound"]
        }
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (response2.status === 200 && response2.data.success) {
      TestLogger.success('User profile analyze request successful');
      TestLogger.info('Agent insights', {
        primaryAgent: response2.data.data?.agentInsights?.primaryAgent,
        intent: response2.data.data?.agentInsights?.intent,
        confidence: response2.data.data?.agentInsights?.confidence,
        hasRecommendations: response2.data.data?.agentInsights?.recommendations?.length > 0
      });
    } else {
      TestLogger.error('User profile analyze request failed', response2.data);
    }

    // Test 3: Error handling
    TestLogger.info('Test 3: Error handling (missing message)');
    try {
      const response3 = await axiosInstance.post(
        `http://${CONFIG.server.host}:${CONFIG.server.port}/api/chat/analyze`,
        {
          userId: "test-user-789"
          // Missing message field
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      TestLogger.error('Should have failed but didn\'t', response3.data);
    } catch (error) {
      if (error.response?.status === 400) {
        TestLogger.success('Error handling works correctly (400 for missing message)');
      } else {
        TestLogger.error('Unexpected error response', error.response?.data);
      }
    }

  } catch (error) {
    TestLogger.error('Test suite failed', error);
  }
}

async function testDebugEndpoint() {
  TestLogger.section('Testing Debug Endpoint');

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
    } else {
      TestLogger.error('Debug endpoint failed', response.data);
    }

  } catch (error) {
    TestLogger.error('Debug endpoint test failed', error);
  }
}

async function testServerHealth() {
  TestLogger.section('Testing Server Health');

  try {
    const response = await axiosInstance.get(
      `http://${CONFIG.server.host}:${CONFIG.server.port}/health`
    );

    if (response.status === 200) {
      TestLogger.success('Server is healthy');
      TestLogger.info('Health status', response.data);
    } else {
      TestLogger.error('Server health check failed', response.data);
    }

  } catch (error) {
    TestLogger.error('Server health test failed', error);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Analyze-Only Endpoint Tests');
  console.log(`📍 Testing server at: http://${CONFIG.server.host}:${CONFIG.server.port}`);
  console.log('');

  await testServerHealth();
  await testDebugEndpoint();
  await testAnalyzeEndpoint();

  console.log('\n✨ Test suite completed!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Integrate the /api/chat/analyze endpoint in your frontend');
  console.log('2. Use the debug endpoint for system monitoring');
  console.log('3. Test with various query types and user profiles');
  console.log('4. Monitor response times and agent performance');
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
  testAnalyzeEndpoint,
  testDebugEndpoint,
  testServerHealth,
  CONFIG
};
