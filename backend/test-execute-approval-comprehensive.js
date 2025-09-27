// Use ts-node to import TypeScript modules
require('ts-node/register');

const { EnhancedAgenticOrchestrator } = require('./src/services/EnhancedAgenticOrchestrator.ts');
const { BlockchainActionService } = require('./src/services/BlockchainActionService.ts');
const { AgenticPromptService } = require('./src/services/AgenticPromptService.ts');
const { OneInchService } = require('./src/services/OneInchService.ts');
const { NetworkConfigService } = require('./src/services/NetworkConfigService.ts');

// Comprehensive test for execute with approval mode
async function testExecuteApprovalComprehensive() {
  console.log('🧪 COMPREHENSIVE EXECUTE WITH APPROVAL TEST');
  console.log('=' .repeat(80));
  console.log('Testing: Query-to-Agent Flow, 1inch Integration, Network Switching\n');

  const results = {
    queryToAgent: { passed: 0, failed: 0, tests: [] },
    oneInchIntegration: { passed: 0, failed: 0, tests: [] },
    networkSwitching: { passed: 0, failed: 0, tests: [] }
  };

  try {
    // Initialize services
    console.log('🔧 Initializing services...');
    const blockchainService = new BlockchainActionService();
    const promptService = new AgenticPromptService();
    const orchestrator = new EnhancedAgenticOrchestrator(blockchainService, promptService);
    const oneInchService = new OneInchService(1); // Start with Ethereum
    const networkService = new NetworkConfigService();
    
    console.log('✅ Services initialized successfully\n');

    // ========================================
    // TEST 1: QUERY-TO-AGENT FLOW
    // ========================================
    console.log('📋 TEST SECTION 1: QUERY-TO-AGENT FLOW');
    console.log('-'.repeat(50));

    const testQueries = [
      {
        name: 'Simple Swap Query',
        request: {
          intent: "Swap 1 ETH for USDC with best price",
          userAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
          mode: 'execute_with_approval',
          constraints: {
            amount: '1',
            fromToken: 'ETH',
            toToken: 'USDC',
            maxSlippage: '1%'
          }
        }
      },
      {
        name: 'Yield Optimization Query',
        request: {
          intent: "Find best yield farming opportunity for my USDC",
          userAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
          mode: 'execute_with_approval',
          constraints: {
            amount: '10000',
            token: 'USDC',
            riskTolerance: 'medium'
          }
        }
      },
      {
        name: 'Complex Multi-Action Query',
        request: {
          intent: "Swap ETH to USDC, then stake in highest APY pool on Polygon",
          userAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
          mode: 'execute_with_approval',
          constraints: {
            amount: '2',
            fromToken: 'ETH',
            preferredNetwork: 'polygon'
          }
        }
      }
    ];

    for (const testQuery of testQueries) {
      try {
        console.log(`\n🔍 Testing: ${testQuery.name}`);
        console.log(`Query: "${testQuery.request.intent}"`);
        
        const startTime = Date.now();
        const response = await orchestrator.processExecuteWithApprovalRequest(testQuery.request);
        const executionTime = Date.now() - startTime;
        
        console.log(`⏱️  Execution time: ${executionTime}ms`);
        console.log(`📊 Response status: ${response.status}`);
        
        if (response.status === 'awaiting_approval') {
          console.log(`✅ Action plan generated with ${response.actionPlan?.actions?.length || 0} actions`);
          console.log(`🌐 Selected network: ${response.network?.name || 'Unknown'} (Chain ID: ${response.network?.chainId || 'Unknown'})`);
          console.log(`⛽ Estimated gas cost: ${response.estimatedGasCosts || 'Unknown'} ETH`);
          console.log(`🎯 Risk level: ${response.riskAssessment?.riskLevel || 'Unknown'}`);
          
          results.queryToAgent.passed++;
          results.queryToAgent.tests.push({
            name: testQuery.name,
            status: 'PASSED',
            executionTime,
            details: {
              actionCount: response.actionPlan?.actions?.length || 0,
              network: response.network?.name,
              riskLevel: response.riskAssessment?.riskLevel
            }
          });
        } else if (response.status === 'error') {
          console.log(`❌ Error: ${response.error}`);
          results.queryToAgent.failed++;
          results.queryToAgent.tests.push({
            name: testQuery.name,
            status: 'FAILED',
            error: response.error
          });
        } else {
          console.log(`⚠️  Unexpected status: ${response.status}`);
          results.queryToAgent.failed++;
          results.queryToAgent.tests.push({
            name: testQuery.name,
            status: 'FAILED',
            error: `Unexpected status: ${response.status}`
          });
        }
      } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        results.queryToAgent.failed++;
        results.queryToAgent.tests.push({
          name: testQuery.name,
          status: 'FAILED',
          error: error.message
        });
      }
    }

    // ========================================
    // TEST 2: 1INCH INTEGRATION
    // ========================================
    console.log('\n\n📋 TEST SECTION 2: 1INCH INTEGRATION');
    console.log('-'.repeat(50));

    const oneInchTests = [
      {
        name: 'Ethereum Swap Quote',
        chainId: 1,
        params: {
          fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
          toTokenAddress: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC (mainnet)
          amount: '1000000000000000000', // 1 ETH
          fromAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          slippage: 1
        }
      },
      {
        name: 'Polygon Swap Quote',
        chainId: 137,
        params: {
          fromTokenAddress: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
          toTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
          amount: '1000000000000000000', // 1 WMATIC
          fromAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          slippage: 1
        }
      }
    ];

    for (const test of oneInchTests) {
      try {
        console.log(`\n🔍 Testing: ${test.name}`);
        console.log(`Chain ID: ${test.chainId}`);
        
        // Set chain ID
        oneInchService.setChainId(test.chainId);
        
        // Test quote
        console.log('📊 Getting swap quote...');
        const quote = await oneInchService.getSwapQuote(test.params);
        
        console.log(`✅ Quote received:`);
        console.log(`   Expected output: ${quote.toTokenAmount}`);
        console.log(`   Estimated gas: ${quote.estimatedGas}`);
        console.log(`   Price: ${quote.price}`);
        
        // Test transaction building
        console.log('🔨 Building swap transaction...');
        const swapTx = await oneInchService.buildSwapTransaction(test.params);
        
        console.log(`✅ Transaction built:`);
        console.log(`   To: ${swapTx.tx.to}`);
        console.log(`   Gas: ${swapTx.tx.gas}`);
        console.log(`   Value: ${swapTx.tx.value}`);
        
        // Test allowance check
        console.log('🔍 Checking token allowance...');
        const allowance = await oneInchService.checkAllowance(
          test.params.fromTokenAddress,
          test.params.fromAddress
        );
        
        console.log(`✅ Allowance check:`);
        console.log(`   Current allowance: ${allowance.allowance}`);
        console.log(`   Is approved: ${allowance.isApproved}`);
        
        results.oneInchIntegration.passed++;
        results.oneInchIntegration.tests.push({
          name: test.name,
          status: 'PASSED',
          details: {
            chainId: test.chainId,
            quoteReceived: !!quote.toTokenAmount,
            transactionBuilt: !!swapTx.tx,
            allowanceChecked: true
          }
        });
        
      } catch (error) {
        console.log(`❌ 1inch test failed: ${error.message}`);
        console.log(`   This might be expected in test environment without API keys`);
        
        results.oneInchIntegration.failed++;
        results.oneInchIntegration.tests.push({
          name: test.name,
          status: 'FAILED',
          error: error.message,
          note: 'Expected failure in test environment'
        });
      }
    }

    // ========================================
    // TEST 3: NETWORK SWITCHING LOGIC
    // ========================================
    console.log('\n\n📋 TEST SECTION 3: NETWORK SWITCHING LOGIC');
    console.log('-'.repeat(50));

    const networkTests = [
      {
        name: 'Ethereum Network Config',
        chainId: 1
      },
      {
        name: 'Polygon Network Config',
        chainId: 137
      },
      {
        name: 'Rootstock Network Config',
        chainId: 30
      }
    ];

    for (const test of networkTests) {
      try {
        console.log(`\n🔍 Testing: ${test.name}`);
        
        // Test network configuration
        const networkConfig = networkService.getNetworkConfig(test.chainId);
        console.log(`✅ Network config retrieved:`);
        console.log(`   Name: ${networkConfig.name}`);
        console.log(`   Chain ID: ${networkConfig.chainId}`);
        console.log(`   Native token: ${networkConfig.nativeToken}`);
        
        // Test network name
        const networkName = networkService.getNetworkName(test.chainId);
        console.log(`✅ Network name: ${networkName}`);
        
        // Test supported network check
        const isSupported = networkService.isSupportedNetwork(test.chainId);
        console.log(`✅ Is supported: ${isSupported}`);
        
        // Test blockchain service network switching
        await blockchainService.switchNetwork(test.chainId);
        console.log(`✅ Blockchain service switched to network`);
        
        // Test best network determination
        const bestNetwork = blockchainService.determineBestNetwork(30); // 30 USD gas threshold
        console.log(`✅ Best network for 30 USD gas threshold: Chain ${bestNetwork}`);
        
        results.networkSwitching.passed++;
        results.networkSwitching.tests.push({
          name: test.name,
          status: 'PASSED',
          details: {
            chainId: test.chainId,
            networkName,
            isSupported,
            bestNetworkLogic: bestNetwork
          }
        });
        
      } catch (error) {
        console.log(`❌ Network test failed: ${error.message}`);
        
        results.networkSwitching.failed++;
        results.networkSwitching.tests.push({
          name: test.name,
          status: 'FAILED',
          error: error.message
        });
      }
    }

    // ========================================
    // TEST SUMMARY
    // ========================================
    console.log('\n\n📊 COMPREHENSIVE TEST RESULTS');
    console.log('=' .repeat(80));
    
    console.log('\n🔍 QUERY-TO-AGENT FLOW:');
    console.log(`   ✅ Passed: ${results.queryToAgent.passed}`);
    console.log(`   ❌ Failed: ${results.queryToAgent.failed}`);
    console.log(`   📊 Success Rate: ${((results.queryToAgent.passed / (results.queryToAgent.passed + results.queryToAgent.failed)) * 100).toFixed(1)}%`);
    
    console.log('\n🔗 1INCH INTEGRATION:');
    console.log(`   ✅ Passed: ${results.oneInchIntegration.passed}`);
    console.log(`   ❌ Failed: ${results.oneInchIntegration.failed}`);
    console.log(`   📊 Success Rate: ${((results.oneInchIntegration.passed / (results.oneInchIntegration.passed + results.oneInchIntegration.failed)) * 100).toFixed(1)}%`);
    console.log(`   ⚠️  Note: 1inch failures expected without API access`);
    
    console.log('\n🌐 NETWORK SWITCHING:');
    console.log(`   ✅ Passed: ${results.networkSwitching.passed}`);
    console.log(`   ❌ Failed: ${results.networkSwitching.failed}`);
    console.log(`   📊 Success Rate: ${((results.networkSwitching.passed / (results.networkSwitching.passed + results.networkSwitching.failed)) * 100).toFixed(1)}%`);
    
    const totalPassed = results.queryToAgent.passed + results.oneInchIntegration.passed + results.networkSwitching.passed;
    const totalFailed = results.queryToAgent.failed + results.oneInchIntegration.failed + results.networkSwitching.failed;
    const overallSuccessRate = ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1);
    
    console.log('\n🎯 OVERALL RESULTS:');
    console.log(`   ✅ Total Passed: ${totalPassed}`);
    console.log(`   ❌ Total Failed: ${totalFailed}`);
    console.log(`   📊 Overall Success Rate: ${overallSuccessRate}%`);
    
    // Detailed results
    console.log('\n📋 DETAILED TEST RESULTS:');
    console.log(JSON.stringify(results, null, 2));
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (results.queryToAgent.failed > 0) {
      console.log('   🔧 Query-to-Agent: Check agent routing and prompt service configuration');
    }
    if (results.oneInchIntegration.failed > 0) {
      console.log('   🔧 1inch Integration: Add proper API keys and RPC endpoints for production');
    }
    if (results.networkSwitching.failed > 0) {
      console.log('   🔧 Network Switching: Verify network configurations and RPC endpoints');
    }
    
    console.log('\n🎉 Comprehensive test completed!');
    
    return results;

  } catch (error) {
    console.error('❌ Comprehensive test failed:', error);
    console.error('Stack trace:', error.stack);
    return null;
  }
}

// Run the test
if (require.main === module) {
  testExecuteApprovalComprehensive().catch(console.error);
}

module.exports = { testExecuteApprovalComprehensive };
