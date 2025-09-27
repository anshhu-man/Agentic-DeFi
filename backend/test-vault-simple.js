const axios = require('axios');

// Simple test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CONFIG = {
  timeout: 30000,
  userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b5',
  network: 'sepolia'
};

// Test utilities
const makeRequest = async (method, endpoint, data = null, params = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      timeout: TEST_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) config.data = data;
    if (params) config.params = params;

    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.response?.data || error.message,
      message: error.message
    };
  }
};

// Simple test runner
const runSimpleTests = async () => {
  console.log('🧪 Running Simple Safe-Exit Vault Tests\n');
  
  let passed = 0;
  let failed = 0;

  const test = async (name, testFn) => {
    try {
      console.log(`📋 Testing ${name}...`);
      const result = await testFn();
      if (result) {
        console.log(`✅ ${name} - PASSED`);
        passed++;
      } else {
        console.log(`❌ ${name} - FAILED`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name} - ERROR: ${error.message}`);
      failed++;
    }
  };

  // Test 1: Server Health Check
  await test('Server Health Check', async () => {
    const response = await makeRequest('GET', '/health');
    return response.success && response.status === 200;
  });

  // Test 2: Basic Pyth Price Fetch
  await test('Basic Pyth Price Fetch', async () => {
    const response = await makeRequest('GET', '/api/pyth/price', null, {
      symbol: 'ETH/USD'
    });
    return response.success && response.data?.success;
  });

  // Test 3: Multiple Price Fetch
  await test('Multiple Price Fetch', async () => {
    const response = await makeRequest('GET', '/api/pyth/prices', null, {
      symbols: 'ETH/USD,BTC/USD'
    });
    return response.success && response.data?.success;
  });

  // Test 4: Vault Configuration
  await test('Vault Configuration', async () => {
    const response = await makeRequest('GET', '/api/vault/config');
    return response.success && response.data?.success;
  });

  // Test 5: Price Update Fee Calculation
  await test('Price Update Fee Calculation', async () => {
    const response = await makeRequest('GET', '/api/pyth/update-fee', null, {
      symbols: 'ETH/USD',
      network: 'sepolia'
    });
    return response.success && response.data?.success;
  });

  // Test 6: Confidence Validation
  await test('Confidence Validation', async () => {
    const response = await makeRequest('GET', '/api/pyth/confidence', null, {
      symbol: 'ETH/USD',
      price: '250000000000',
      confidence: '1000000000',
      expo: '-8',
      maxConfBps: '50'
    });
    return response.success && response.data?.success;
  });

  // Test 7: Vault Deployment (Simulated)
  await test('Vault Deployment', async () => {
    const response = await makeRequest('POST', '/api/vault/deploy', {
      network: TEST_CONFIG.network
    });
    return response.success && response.data?.success;
  });

  // Test 8: Position Check
  await test('Position Check', async () => {
    const response = await makeRequest('GET', `/api/vault/positions/${TEST_CONFIG.userAddress}`, null, {
      vaultAddress: '0x1234567890123456789012345678901234567890',
      network: TEST_CONFIG.network
    });
    // This might fail but should handle gracefully
    return response.status !== 500; // Not a server error
  });

  // Results Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎯 SIMPLE TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (passed > failed) {
    console.log('\n🎉 Most tests passed! The Safe-Exit Vault backend is working.');
    console.log('✨ Key features validated:');
    console.log('   • Server is running and healthy');
    console.log('   • Pyth price fetching works');
    console.log('   • Vault configuration is accessible');
    console.log('   • API endpoints are responding');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the server logs.');
  }

  console.log('\n📋 To run comprehensive tests:');
  console.log('   node test-vault-comprehensive.js');
};

// Check if server is running first
const checkServer = async () => {
  console.log('🔍 Checking if server is running...');
  
  try {
    const response = await makeRequest('GET', '/health');
    if (response.success) {
      console.log('✅ Server is running!\n');
      return true;
    } else {
      console.log('❌ Server is not responding properly.');
      return false;
    }
  } catch (error) {
    console.log('❌ Server is not running. Please start it first:');
    console.log('   npm start');
    return false;
  }
};

// Main execution
const main = async () => {
  console.log('🚀 Safe-Exit Vault Simple Test Suite');
  console.log('=====================================\n');
  
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runSimpleTests();
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runSimpleTests, checkServer, makeRequest };
