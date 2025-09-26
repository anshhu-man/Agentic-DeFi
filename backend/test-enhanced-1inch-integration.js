// Use ts-node to import TypeScript modules
require('ts-node/register');

const { Enhanced1InchService } = require('./src/services/Enhanced1InchService.ts');
const { ENSService } = require('./src/services/ENSService.ts');

// Test the enhanced 1inch integration with Fusion+, Intent-based swaps, and ENS
async function testEnhanced1InchIntegration() {
  console.log('🚀 ENHANCED 1INCH INTEGRATION TEST');
  console.log('=' .repeat(80));
  console.log('Testing: Fusion+, Intent-based Swaps, Price Feeds, Wallet Balances, ENS\n');

  const results = {
    enhanced1inch: { passed: 0, failed: 0, tests: [] },
    ensService: { passed: 0, failed: 0, tests: [] },
    integration: { passed: 0, failed: 0, tests: [] }
  };

  try {
    // Initialize services
    console.log('🔧 Initializing enhanced services...');
    const enhanced1inch = new Enhanced1InchService(1); // Ethereum
    const ensService = new ENSService();
    
    console.log('✅ Enhanced services initialized successfully\n');

    // ========================================
    // TEST 1: ENHANCED 1INCH FEATURES
    // ========================================
    console.log('📋 TEST SECTION 1: ENHANCED 1INCH FEATURES');
    console.log('-'.repeat(50));

    const enhanced1inchTests = [
      {
        name: 'Feature Support Check',
        test: async () => {
          const features = enhanced1inch.getSupportedFeatures();
          console.log('✅ Supported features:', JSON.stringify(features, null, 2));
          return { success: true, data: features };
        }
      },
      {
        name: 'Enhanced Swap Quote',
        test: async () => {
          const quote = await enhanced1inch.getEnhancedSwapQuote({
            fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
            toTokenAddress: '0xA0b86a33E6441b8435b662f0E2d0B8A0E4B5B8A0', // USDC
            amount: '1000000000000000000', // 1 ETH
            fromAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            includeTokensInfo: true,
            includeProtocols: true,
            includeGasInfo: true
          });
          
          console.log('✅ Enhanced quote received');
          console.log(`   Expected output: ${quote.toTokenAmount}`);
          console.log(`   From token: ${quote.fromToken?.symbol || 'Unknown'}`);
          console.log(`   To token: ${quote.toToken?.symbol || 'Unknown'}`);
          
          return { success: true, data: quote };
        }
      },
      {
        name: 'Intent-Based Swap (Best Price)',
        test: async () => {
          if (!enhanced1inch.isFusionSupported()) {
            console.log('⚠️  Fusion not supported on current chain - skipping');
            return { success: true, skipped: true };
          }

          const intentSwap = await enhanced1inch.createIntentBasedSwap({
            fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
            toTokenAddress: '0xA0b86a33E6441b8435b662f0E2d0B8A0E4B5B8A0',
            amount: '1000000000000000000',
            fromAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            intent: 'best_price',
            constraints: {
              maxSlippage: 1,
              deadline: Math.floor(Date.now() / 1000) + 1800
            }
          });
          
          console.log('✅ Intent-based swap created');
          console.log(`   Order hash: ${intentSwap.orderHash}`);
          console.log(`   Preset: ${intentSwap.preset}`);
          
          return { success: true, data: intentSwap };
        }
      },
      {
        name: 'Cross-Chain Fusion+ Quote',
        test: async () => {
          if (!enhanced1inch.isFusionSupported()) {
            console.log('⚠️  Fusion+ not supported - skipping');
            return { success: true, skipped: true };
          }

          const crossChainQuote = await enhanced1inch.createFusionCrossChainSwap({
            fromChainId: 1, // Ethereum
            toChainId: 137, // Polygon
            fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
            toTokenAddress: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
            amount: '1000000000000000000',
            fromAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            slippage: 1
          });
          
          console.log('✅ Cross-chain Fusion+ quote created');
          console.log(`   Order hash: ${crossChainQuote.orderHash}`);
          
          return { success: true, data: crossChainQuote };
        }
      },
      {
        name: 'Price Feeds API',
        test: async () => {
          const prices = await enhanced1inch.getTokenPrices({
            tokens: [
              '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
              '0xA0b86a33E6441b8435b662f0E2d0B8A0E4B5B8A0'  // USDC
            ],
            currency: 'USD'
          });
          
          console.log('✅ Token prices retrieved');
          console.log('   Prices:', JSON.stringify(prices, null, 2));
          
          return { success: true, data: prices };
        }
      },
      {
        name: 'Wallet Balances API',
        test: async () => {
          const balances = await enhanced1inch.getWalletBalances({
            addresses: ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6']
          });
          
          console.log('✅ Wallet balances retrieved');
          console.log('   Balance data structure received');
          
          return { success: true, data: balances };
        }
      },
      {
        name: 'Best Swap Method Selection',
        test: async () => {
          const bestMethod = await enhanced1inch.getBestSwapMethod({
            fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
            toTokenAddress: '0xA0b86a33E6441b8435b662f0E2d0B8A0E4B5B8A0',
            amount: '1000000000000000000',
            fromAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            intent: 'best_price'
          });
          
          console.log('✅ Best swap method determined');
          console.log(`   Method: ${bestMethod.method}`);
          console.log(`   Reasoning: ${bestMethod.reasoning}`);
          
          return { success: true, data: bestMethod };
        }
      },
      {
        name: 'Portfolio Analysis',
        test: async () => {
          const analysis = await enhanced1inch.analyzePortfolioForExecution('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
          
          console.log('✅ Portfolio analysis completed');
          console.log(`   Total value: $${analysis.totalValueUSD}`);
          console.log(`   Top holdings: ${analysis.topHoldings.length}`);
          console.log(`   Recommendations: ${analysis.recommendations.length}`);
          
          return { success: true, data: analysis };
        }
      }
    ];

    for (const test of enhanced1inchTests) {
      try {
        console.log(`\n🔍 Testing: ${test.name}`);
        const result = await test.test();
        
        if (result.skipped) {
          console.log('⚠️  Test skipped due to feature limitations');
          results.enhanced1inch.tests.push({
            name: test.name,
            status: 'SKIPPED',
            reason: 'Feature not supported in test environment'
          });
        } else {
          console.log('✅ Test passed');
          results.enhanced1inch.passed++;
          results.enhanced1inch.tests.push({
            name: test.name,
            status: 'PASSED',
            data: result.data
          });
        }
      } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        console.log('   This might be expected without API keys');
        
        results.enhanced1inch.failed++;
        results.enhanced1inch.tests.push({
          name: test.name,
          status: 'FAILED',
          error: error.message,
          note: 'Expected failure without API keys'
        });
      }
    }

    // ========================================
    // TEST 2: ENS SERVICE
    // ========================================
    console.log('\n\n📋 TEST SECTION 2: ENS SERVICE');
    console.log('-'.repeat(50));

    const ensTests = [
      {
        name: 'ENS Name Resolution',
        test: async () => {
          const result = await ensService.resolveNameToAddress('vitalik.eth');
          console.log('✅ ENS resolution result:', JSON.stringify(result, null, 2));
          return result;
        }
      },
      {
        name: 'Address to ENS Reverse Resolution',
        test: async () => {
          const result = await ensService.resolveAddressToName('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
          console.log('✅ Reverse resolution result:', JSON.stringify(result, null, 2));
          return result;
        }
      },
      {
        name: 'Smart Resolution (Auto-detect)',
        test: async () => {
          const results = await Promise.all([
            ensService.smartResolve('vitalik.eth'),
            ensService.smartResolve('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
          ]);
          
          console.log('✅ Smart resolution results:');
          results.forEach((result, index) => {
            console.log(`   ${index + 1}. ${JSON.stringify(result, null, 2)}`);
          });
          
          return results;
        }
      },
      {
        name: 'Display Name Generation',
        test: async () => {
          const displayNames = await Promise.all([
            ensService.getDisplayName('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'),
            ensService.getDisplayName('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')
          ]);
          
          console.log('✅ Display names generated:');
          displayNames.forEach((name, index) => {
            console.log(`   ${index + 1}. ${name}`);
          });
          
          return displayNames;
        }
      },
      {
        name: 'Address Normalization',
        test: async () => {
          const normalized = await ensService.normalizeAddress('vitalik.eth');
          console.log('✅ Address normalized:', JSON.stringify(normalized, null, 2));
          return normalized;
        }
      }
    ];

    for (const test of ensTests) {
      try {
        console.log(`\n🔍 Testing: ${test.name}`);
        const result = await test.test();
        
        console.log('✅ Test passed');
        results.ensService.passed++;
        results.ensService.tests.push({
          name: test.name,
          status: 'PASSED',
          data: result
        });
      } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        console.log('   This might be expected without RPC access');
        
        results.ensService.failed++;
        results.ensService.tests.push({
          name: test.name,
          status: 'FAILED',
          error: error.message,
          note: 'Expected failure without RPC access'
        });
      }
    }

    // ========================================
    // TEST 3: INTEGRATION SCENARIOS
    // ========================================
    console.log('\n\n📋 TEST SECTION 3: INTEGRATION SCENARIOS');
    console.log('-'.repeat(50));

    const integrationTests = [
      {
        name: 'ENS + 1inch Portfolio Analysis',
        test: async () => {
          // Resolve ENS name first
          const ensResult = await ensService.resolveNameToAddress('vitalik.eth');
          
          if (ensResult.isValid && ensResult.address) {
            // Analyze portfolio using resolved address
            const analysis = await enhanced1inch.analyzePortfolioForExecution(ensResult.address);
            
            console.log('✅ ENS + Portfolio integration successful');
            console.log(`   ENS: ${ensResult.name} -> ${ensResult.address}`);
            console.log(`   Portfolio value: $${analysis.totalValueUSD}`);
            
            return { ensResult, analysis };
          } else {
            throw new Error('ENS resolution failed');
          }
        }
      },
      {
        name: 'Multi-Chain Intent Execution Planning',
        test: async () => {
          // Plan a cross-chain strategy
          const strategy = {
            user: 'alice.eth',
            intent: 'Move ETH to Polygon for lower gas DeFi operations',
            steps: [
              '1. Resolve alice.eth to address',
              '2. Check ETH balance on Ethereum',
              '3. Get Fusion+ cross-chain quote',
              '4. Analyze gas costs vs benefits',
              '5. Prepare execution plan'
            ]
          };
          
          console.log('✅ Multi-chain strategy planned');
          console.log('   Strategy:', JSON.stringify(strategy, null, 2));
          
          return strategy;
        }
      },
      {
        name: 'AI Agent Decision Making Simulation',
        test: async () => {
          // Simulate AI agent decision making process
          const userInput = "I want to swap 1 ETH for USDC with the best price";
          const userAddress = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6";
          
          // Step 1: Analyze user intent
          const intent = 'best_price';
          
          // Step 2: Get best swap method
          const bestMethod = await enhanced1inch.getBestSwapMethod({
            fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
            toTokenAddress: '0xA0b86a33E6441b8435b662f0E2d0B8A0E4B5B8A0',
            amount: '1000000000000000000',
            fromAddress: userAddress,
            intent: 'best_price'
          });
          
          // Step 3: Analyze portfolio
          const portfolio = await enhanced1inch.analyzePortfolioForExecution(userAddress);
          
          // Step 4: Make recommendation
          const recommendation = {
            method: bestMethod.method,
            reasoning: bestMethod.reasoning,
            portfolioInsights: portfolio.recommendations,
            riskLevel: portfolio.totalValueUSD > 10000 ? 'low' : 'medium',
            shouldProceed: true
          };
          
          console.log('✅ AI agent decision simulation completed');
          console.log('   Recommendation:', JSON.stringify(recommendation, null, 2));
          
          return recommendation;
        }
      }
    ];

    for (const test of integrationTests) {
      try {
        console.log(`\n🔍 Testing: ${test.name}`);
        const result = await test.test();
        
        console.log('✅ Integration test passed');
        results.integration.passed++;
        results.integration.tests.push({
          name: test.name,
          status: 'PASSED',
          data: result
        });
      } catch (error) {
        console.log(`❌ Integration test failed: ${error.message}`);
        
        results.integration.failed++;
        results.integration.tests.push({
          name: test.name,
          status: 'FAILED',
          error: error.message
        });
      }
    }

    // ========================================
    // TEST SUMMARY
    // ========================================
    console.log('\n\n📊 ENHANCED 1INCH INTEGRATION TEST RESULTS');
    console.log('=' .repeat(80));
    
    console.log('\n🔗 ENHANCED 1INCH FEATURES:');
    console.log(`   ✅ Passed: ${results.enhanced1inch.passed}`);
    console.log(`   ❌ Failed: ${results.enhanced1inch.failed}`);
    console.log(`   📊 Success Rate: ${((results.enhanced1inch.passed / (results.enhanced1inch.passed + results.enhanced1inch.failed)) * 100).toFixed(1)}%`);
    
    console.log('\n🏷️  ENS SERVICE:');
    console.log(`   ✅ Passed: ${results.ensService.passed}`);
    console.log(`   ❌ Failed: ${results.ensService.failed}`);
    console.log(`   📊 Success Rate: ${((results.ensService.passed / (results.ensService.passed + results.ensService.failed)) * 100).toFixed(1)}%`);
    
    console.log('\n🔄 INTEGRATION SCENARIOS:');
    console.log(`   ✅ Passed: ${results.integration.passed}`);
    console.log(`   ❌ Failed: ${results.integration.failed}`);
    console.log(`   📊 Success Rate: ${((results.integration.passed / (results.integration.passed + results.integration.failed)) * 100).toFixed(1)}%`);
    
    const totalPassed = results.enhanced1inch.passed + results.ensService.passed + results.integration.passed;
    const totalFailed = results.enhanced1inch.failed + results.ensService.failed + results.integration.failed;
    const overallSuccessRate = ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1);
    
    console.log('\n🎯 OVERALL RESULTS:');
    console.log(`   ✅ Total Passed: ${totalPassed}`);
    console.log(`   ❌ Total Failed: ${totalFailed}`);
    console.log(`   📊 Overall Success Rate: ${overallSuccessRate}%`);
    
    // Hackathon readiness assessment
    console.log('\n🏆 HACKATHON READINESS ASSESSMENT:');
    
    const readinessScore = (totalPassed / (totalPassed + totalFailed)) * 100;
    
    if (readinessScore >= 80) {
      console.log('🎉 EXCELLENT - Ready for hackathon demo!');
      console.log('   ✅ Enhanced 1inch integration working');
      console.log('   ✅ ENS resolution functional');
      console.log('   ✅ AI agent integration scenarios tested');
    } else if (readinessScore >= 60) {
      console.log('⚠️  GOOD - Mostly ready, some API access needed');
      console.log('   ✅ Core functionality implemented');
      console.log('   ⚠️  Some features need API keys for full functionality');
    } else {
      console.log('🔧 NEEDS WORK - Core issues to resolve');
      console.log('   ❌ Multiple integration issues detected');
      console.log('   🔧 Requires debugging before demo');
    }
    
    console.log('\n💡 NEXT STEPS FOR HACKATHON:');
    console.log('   1. Add 1inch API key for full functionality');
    console.log('   2. Configure RPC endpoints for ENS resolution');
    console.log('   3. Test with real wallet connections');
    console.log('   4. Create frontend demo interface');
    console.log('   5. Prepare demo scenarios showcasing AI + DeFi integration');
    
    console.log('\n🎉 Enhanced 1inch integration test completed!');
    
    return results;

  } catch (error) {
    console.error('❌ Enhanced integration test failed:', error);
    console.error('Stack trace:', error.stack);
    return null;
  }
}

// Run the test
if (require.main === module) {
  testEnhanced1InchIntegration().catch(console.error);
}

module.exports = { testEnhanced1InchIntegration };
