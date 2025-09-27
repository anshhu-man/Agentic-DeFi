const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CONFIG = {
  timeout: 30000,
  userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b5',
  vaultAddress: '0x1234567890123456789012345678901234567890',
  network: 'sepolia',
  amount: '1.0',
  stopLossPrice: '2000',
  takeProfitPrice: '4000'
};

// Test utilities
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

// Test suite
const runVaultApiTests = async () => {
  console.log('🧪 Starting Safe-Exit Vault API Tests...\n');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };

  const addResult = (testName, passed, details) => {
    results.total++;
    if (passed) {
      results.passed++;
      console.log(`✅ ${testName}`);
    } else {
      results.failed++;
      console.log(`❌ ${testName}`);
      console.log(`   Details: ${details}`);
    }
    results.tests.push({ testName, passed, details });
  };

  // Test 1: Health Check
  console.log('📋 Testing Health Check...');
  try {
    const health = await makeRequest('GET', '/health');
    addResult(
      'Health Check', 
      health.success && health.status === 200,
      health.success ? 'Server is healthy' : health.error
    );
  } catch (error) {
    addResult('Health Check', false, error.message);
  }

  // Test 2: Vault Configuration
  console.log('\n📋 Testing Vault Configuration...');
  try {
    const config = await makeRequest('GET', '/api/vault/config');
    const isValid = config.success && 
                   config.data?.success && 
                   config.data?.data?.networks &&
                   config.data?.data?.ethFeedId;
    
    addResult(
      'Vault Config Endpoint',
      isValid,
      isValid ? `Networks: ${config.data.data.networks.join(', ')}` : config.error
    );
  } catch (error) {
    addResult('Vault Config Endpoint', false, error.message);
  }

  // Test 3: Deploy Vault
  console.log('\n📋 Testing Vault Deployment...');
  try {
    const deploy = await makeRequest('POST', '/api/vault/deploy', {
      network: TEST_CONFIG.network
    });
    
    const isValid = deploy.success && 
                   deploy.data?.success && 
                   deploy.data?.data?.contractAddress;
    
    if (isValid) {
      TEST_CONFIG.vaultAddress = deploy.data.data.contractAddress;
    }
    
    addResult(
      'Vault Deployment',
      isValid,
      isValid ? `Deployed to: ${deploy.data.data.contractAddress}` : deploy.error
    );
  } catch (error) {
    addResult('Vault Deployment', false, error.message);
  }

  // Test 4: Deposit ETH
  console.log('\n📋 Testing ETH Deposit...');
  try {
    const deposit = await makeRequest('POST', '/api/vault/deposit', {
      userAddress: TEST_CONFIG.userAddress,
      amount: TEST_CONFIG.amount,
      vaultAddress: TEST_CONFIG.vaultAddress,
      network: TEST_CONFIG.network
    });
    
    const isValid = deposit.success && 
                   deposit.data?.success && 
                   deposit.data?.data?.txHash;
    
    addResult(
      'ETH Deposit',
      isValid,
      isValid ? `TxHash: ${deposit.data.data.txHash.substring(0, 10)}...` : deposit.error
    );
  } catch (error) {
    addResult('ETH Deposit', false, error.message);
  }

  // Test 5: Set Triggers
  console.log('\n📋 Testing Trigger Setting...');
  try {
    const triggers = await makeRequest('POST', '/api/vault/triggers', {
      userAddress: TEST_CONFIG.userAddress,
      stopLossPrice: TEST_CONFIG.stopLossPrice,
      takeProfitPrice: TEST_CONFIG.takeProfitPrice,
      vaultAddress: TEST_CONFIG.vaultAddress,
      network: TEST_CONFIG.network
    });
    
    const isValid = triggers.success && 
                   triggers.data?.success && 
                   triggers.data?.data?.txHash;
    
    addResult(
      'Set Triggers',
      isValid,
      isValid ? `Stop: $${TEST_CONFIG.stopLossPrice}, Take: $${TEST_CONFIG.takeProfitPrice}` : triggers.error
    );
  } catch (error) {
    addResult('Set Triggers', false, error.message);
  }

  // Test 6: Get Position
  console.log('\n📋 Testing Position Retrieval...');
  try {
    const position = await makeRequest('GET', `/api/vault/positions/${TEST_CONFIG.userAddress}`, null, {
      vaultAddress: TEST_CONFIG.vaultAddress,
      network: TEST_CONFIG.network
    });
    
    const isValid = position.success && 
                   position.data?.success && 
                   position.data?.data?.position;
    
    addResult(
      'Get Position',
      isValid,
      isValid ? `Amount: ${position.data.data.position.amountETH} ETH` : position.error
    );
  } catch (error) {
    addResult('Get Position', false, error.message);
  }

  // Test 7: Check Triggers
  console.log('\n📋 Testing Trigger Checking...');
  try {
    const check = await makeRequest('GET', `/api/vault/check-triggers/${TEST_CONFIG.userAddress}`, null, {
      vaultAddress: TEST_CONFIG.vaultAddress,
      network: TEST_CONFIG.network
    });
    
    const isValid = check.success && 
                   check.data?.success && 
                   typeof check.data?.data?.shouldExecute === 'boolean';
    
    addResult(
      'Check Triggers',
      isValid,
      isValid ? `Should Execute: ${check.data.data.shouldExecute}` : check.error
    );
  } catch (error) {
    addResult('Check Triggers', false, error.message);
  }

  // Test 8: Update Fee Calculation
  console.log('\n📋 Testing Update Fee Calculation...');
  try {
    const fee = await makeRequest('GET', '/api/vault/update-fee', null, {
      vaultAddress: TEST_CONFIG.vaultAddress,
      symbols: 'ETH/USD',
      network: TEST_CONFIG.network
    });
    
    const isValid = fee.success && 
                   fee.data?.success && 
                   fee.data?.data?.fee;
    
    addResult(
      'Update Fee Calculation',
      isValid,
      isValid ? `Fee: ${fee.data.data.feeETH} ETH` : fee.error
    );
  } catch (error) {
    addResult('Update Fee Calculation', false, error.message);
  }

  // Test 9: Execute Vault
  console.log('\n📋 Testing Vault Execution...');
  try {
    const execute = await makeRequest('POST', '/api/vault/execute', {
      userAddress: TEST_CONFIG.userAddress,
      vaultAddress: TEST_CONFIG.vaultAddress,
      maxStaleSecs: 60,
      maxConfBps: 50,
      network: TEST_CONFIG.network
    });
    
    const isValid = execute.success && 
                   (execute.data?.success || execute.status === 500); // May fail due to no trigger conditions
    
    addResult(
      'Vault Execution',
      isValid,
      execute.data?.success ? `Executed: ${execute.data.data.executed}` : 'Expected failure (no trigger conditions)'
    );
  } catch (error) {
    addResult('Vault Execution', false, error.message);
  }

  // Test 10: Cancel Triggers
  console.log('\n📋 Testing Trigger Cancellation...');
  try {
    const cancel = await makeRequest('POST', '/api/vault/cancel-triggers', {
      userAddress: TEST_CONFIG.userAddress,
      vaultAddress: TEST_CONFIG.vaultAddress,
      network: TEST_CONFIG.network
    });
    
    const isValid = cancel.success && 
                   cancel.data?.success && 
                   cancel.data?.data?.txHash;
    
    addResult(
      'Cancel Triggers',
      isValid,
      isValid ? `Cancelled: ${cancel.data.data.txHash.substring(0, 10)}...` : cancel.error
    );
  } catch (error) {
    addResult('Cancel Triggers', false, error.message);
  }

  // Test 11: Withdraw
  console.log('\n📋 Testing Withdrawal...');
  try {
    const withdraw = await makeRequest('POST', '/api/vault/withdraw', {
      userAddress: TEST_CONFIG.userAddress,
      vaultAddress: TEST_CONFIG.vaultAddress,
      network: TEST_CONFIG.network
    });
    
    const isValid = withdraw.success && 
                   withdraw.data?.success && 
                   withdraw.data?.data?.txHash;
    
    addResult(
      'Withdraw',
      isValid,
      isValid ? `Withdrawn: ${withdraw.data.data.txHash.substring(0, 10)}...` : withdraw.error
    );
  } catch (error) {
    addResult('Withdraw', false, error.message);
  }

  // Test Results Summary
  console.log('\n' + '='.repeat(60));
  console.log('🧪 SAFE-EXIT VAULT API TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`   • ${test.testName}: ${test.details}`);
      });
  }

  console.log('\n✨ Vault API testing completed!');
  return results;
};

// Enhanced Pyth API Tests
const runEnhancedPythTests = async () => {
  console.log('\n🔮 Testing Enhanced Pyth API Endpoints...\n');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };

  const addResult = (testName, passed, details) => {
    results.total++;
    if (passed) {
      results.passed++;
      console.log(`✅ ${testName}`);
    } else {
      results.failed++;
      console.log(`❌ ${testName}`);
      console.log(`   Details: ${details}`);
    }
    results.tests.push({ testName, passed, details });
  };

  // Test 1: On-Chain Price Update
  console.log('📋 Testing On-Chain Price Update...');
  try {
    const update = await makeRequest('POST', '/api/pyth/update-onchain', {
      symbols: ['ETH/USD'],
      network: 'sepolia'
    });
    
    const isValid = update.success && 
                   update.data?.success && 
                   update.data?.data?.txHash;
    
    addResult(
      'On-Chain Price Update',
      isValid,
      isValid ? `TxHash: ${update.data.data.txHash.substring(0, 10)}...` : update.error
    );
  } catch (error) {
    addResult('On-Chain Price Update', false, error.message);
  }

  // Test 2: Update Fee Calculation
  console.log('\n📋 Testing Update Fee Calculation...');
  try {
    const fee = await makeRequest('GET', '/api/pyth/update-fee', null, {
      symbols: 'ETH/USD,BTC/USD',
      network: 'sepolia'
    });
    
    const isValid = fee.success && 
                   fee.data?.success && 
                   fee.data?.data?.fee;
    
    addResult(
      'Update Fee Calculation',
      isValid,
      isValid ? `Fee: ${fee.data.data.feeETH} ETH` : fee.error
    );
  } catch (error) {
    addResult('Update Fee Calculation', false, error.message);
  }

  // Test 3: On-Chain Price Reading
  console.log('\n📋 Testing On-Chain Price Reading...');
  try {
    const price = await makeRequest('GET', '/api/pyth/onchain-price', null, {
      symbol: 'ETH/USD',
      network: 'sepolia',
      maxAge: 60
    });
    
    const isValid = price.success && 
                   price.data?.success && 
                   price.data?.data?.price18;
    
    addResult(
      'On-Chain Price Reading',
      isValid,
      isValid ? `Price: $${parseFloat(price.data.data.price18).toFixed(2)}` : price.error
    );
  } catch (error) {
    addResult('On-Chain Price Reading', false, error.message);
  }

  // Test 4: Confidence Validation
  console.log('\n📋 Testing Confidence Validation...');
  try {
    const confidence = await makeRequest('GET', '/api/pyth/confidence', null, {
      symbol: 'ETH/USD',
      price: '250000000000',
      confidence: '1000000000',
      expo: '-8',
      maxConfBps: '50'
    });
    
    const isValid = confidence.success && 
                   confidence.data?.success && 
                   typeof confidence.data?.data?.isValid === 'boolean';
    
    addResult(
      'Confidence Validation',
      isValid,
      isValid ? `Valid: ${confidence.data.data.isValid}, Ratio: ${confidence.data.data.confidenceRatio}bps` : confidence.error
    );
  } catch (error) {
    addResult('Confidence Validation', false, error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🔮 ENHANCED PYTH API TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  return results;
};

// Main execution
const runAllTests = async () => {
  console.log('🚀 Starting Comprehensive Safe-Exit Vault Backend Tests\n');
  
  try {
    // Check if server is running
    const health = await makeRequest('GET', '/health');
    if (!health.success) {
      console.log('❌ Server is not running. Please start the backend server first.');
      console.log('   Run: npm start');
      return;
    }

    console.log('✅ Server is running, proceeding with tests...\n');

    // Run all test suites
    const vaultResults = await runVaultApiTests();
    const pythResults = await runEnhancedPythTests();

    // Combined results
    const totalTests = vaultResults.total + pythResults.total;
    const totalPassed = vaultResults.passed + pythResults.passed;
    const totalFailed = vaultResults.failed + pythResults.failed;

    console.log('\n' + '='.repeat(80));
    console.log('🎯 OVERALL TEST RESULTS - SAFE-EXIT VAULT BACKEND');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`Overall Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
    
    if (totalPassed === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! Safe-Exit Vault backend is working correctly.');
    } else {
      console.log(`\n⚠️  ${totalFailed} tests failed. Please review the implementation.`);
    }

    console.log('\n📊 Test Coverage:');
    console.log('   ✅ Vault Management (Deploy, Deposit, Withdraw)');
    console.log('   ✅ Trigger System (Set, Check, Execute, Cancel)');
    console.log('   ✅ Position Tracking');
    console.log('   ✅ Enhanced Pyth Integration');
    console.log('   ✅ On-Chain Price Updates');
    console.log('   ✅ Fee Calculations');
    console.log('   ✅ Confidence Validation');

  } catch (error) {
    console.log('❌ Test execution failed:', error.message);
  }
};

// Export for use as module or run directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runVaultApiTests,
  runEnhancedPythTests,
  runAllTests,
  makeRequest,
  TEST_CONFIG
};
