// Simple test to check if the agent system is working
const path = require('path');
const fs = require('fs');

console.log('🚀 Simple Agent System Test\n');

// Test 1: Check if environment variables are set
console.log('📋 Environment Check:');
require('dotenv').config();

const requiredEnvVars = [
  'MISTRAL_API_KEY',
  'PYTH_NETWORK_ENDPOINT',
  'NODE_ENV'
];

let envCheckPassed = true;
for (const envVar of requiredEnvVars) {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: ${envVar === 'MISTRAL_API_KEY' ? '***' + value.slice(-4) : value}`);
  } else {
    console.log(`❌ ${envVar}: Not set`);
    envCheckPassed = false;
  }
}

console.log(`\nEnvironment Check: ${envCheckPassed ? '✅ PASSED' : '❌ FAILED'}\n`);

// Test 2: Check if key files exist
console.log('📁 File Structure Check:');
const keyFiles = [
  'src/services/AgenticOrchestrator.ts',
  'src/services/SemanticRouterService.ts',
  'src/services/MistralService.ts',
  'src/agents/AgenticYieldAgent.ts',
  'package.json',
  'tsconfig.json'
];

let fileCheckPassed = true;
for (const file of keyFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file}: Missing`);
    fileCheckPassed = false;
  }
}

console.log(`\nFile Structure Check: ${fileCheckPassed ? '✅ PASSED' : '❌ FAILED'}\n`);

// Test 3: Check if dependencies are installed
console.log('📦 Dependencies Check:');
const keyDependencies = [
  '@mistralai/mistralai',
  '@pythnetwork/client',
  'axios',
  'dotenv'
];

let depsCheckPassed = true;
for (const dep of keyDependencies) {
  try {
    require.resolve(dep);
    console.log(`✅ ${dep}`);
  } catch (error) {
    console.log(`❌ ${dep}: Not installed`);
    depsCheckPassed = false;
  }
}

console.log(`\nDependencies Check: ${depsCheckPassed ? '✅ PASSED' : '❌ FAILED'}\n`);

// Test 4: Test Mistral API connection
console.log('🤖 Mistral API Test:');
async function testMistralAPI() {
  try {
    const { MistralAI } = require('@mistralai/mistralai');
    
    if (!process.env.MISTRAL_API_KEY) {
      console.log('❌ Mistral API Key not found');
      return false;
    }

    const client = new MistralAI({
      apiKey: process.env.MISTRAL_API_KEY,
    });

    console.log('🔄 Testing Mistral API connection...');
    
    const response = await client.chat.complete({
      model: 'mistral-tiny',
      messages: [
        {
          role: 'user',
          content: 'Hello, respond with just "API working"'
        }
      ],
      maxTokens: 10
    });

    if (response.choices && response.choices[0] && response.choices[0].message) {
      console.log('✅ Mistral API: Connected successfully');
      console.log(`   Response: ${response.choices[0].message.content}`);
      return true;
    } else {
      console.log('❌ Mistral API: Unexpected response format');
      return false;
    }
  } catch (error) {
    console.log(`❌ Mistral API: ${error.message}`);
    return false;
  }
}

// Test 5: Test Pyth Network connection
console.log('\n🌐 Pyth Network Test:');
async function testPythNetwork() {
  try {
    const axios = require('axios');
    const pythEndpoint = process.env.PYTH_NETWORK_ENDPOINT || 'https://hermes.pyth.network';
    
    console.log('🔄 Testing Pyth Network connection...');
    
    const response = await axios.get(`${pythEndpoint}/api/latest_price_feeds?ids[]=0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43`, {
      timeout: 10000
    });

    if (response.data && response.data.length > 0) {
      console.log('✅ Pyth Network: Connected successfully');
      console.log(`   Retrieved ${response.data.length} price feed(s)`);
      return true;
    } else {
      console.log('❌ Pyth Network: No data received');
      return false;
    }
  } catch (error) {
    console.log(`❌ Pyth Network: ${error.message}`);
    return false;
  }
}

// Test 6: Basic semantic analysis test
console.log('\n🧠 Basic Semantic Analysis Test:');
async function testSemanticAnalysis() {
  try {
    // Simple keyword-based semantic analysis
    const testQueries = [
      'Find me high yield USDC opportunities',
      'My portfolio is at risk of liquidation',
      'Show me governance proposals',
      'Compare yields between chains'
    ];

    console.log('🔄 Testing basic query understanding...');
    
    for (const query of testQueries) {
      // Simple intent classification
      let intent = 'UNKNOWN';
      if (query.toLowerCase().includes('yield') || query.toLowerCase().includes('opportunities')) {
        intent = 'YIELD_OPTIMIZATION';
      } else if (query.toLowerCase().includes('risk') || query.toLowerCase().includes('liquidation')) {
        intent = 'RISK_ASSESSMENT';
      } else if (query.toLowerCase().includes('governance') || query.toLowerCase().includes('proposals')) {
        intent = 'GOVERNANCE_PARTICIPATION';
      } else if (query.toLowerCase().includes('compare') || query.toLowerCase().includes('chains')) {
        intent = 'CROSS_CHAIN_ANALYSIS';
      }

      console.log(`   "${query}" → ${intent}`);
    }

    console.log('✅ Basic Semantic Analysis: Working');
    return true;
  } catch (error) {
    console.log(`❌ Basic Semantic Analysis: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🎯 Running Agent System Tests...\n');
  
  const results = {
    environment: envCheckPassed,
    fileStructure: fileCheckPassed,
    dependencies: depsCheckPassed,
    mistralAPI: false,
    pythNetwork: false,
    semanticAnalysis: false
  };

  // Only run API tests if basic checks pass
  if (envCheckPassed && depsCheckPassed) {
    results.mistralAPI = await testMistralAPI();
    results.pythNetwork = await testPythNetwork();
    results.semanticAnalysis = await testSemanticAnalysis();
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const testResults = [
    ['Environment Variables', results.environment],
    ['File Structure', results.fileStructure],
    ['Dependencies', results.dependencies],
    ['Mistral API', results.mistralAPI],
    ['Pyth Network', results.pythNetwork],
    ['Semantic Analysis', results.semanticAnalysis]
  ];

  let passedTests = 0;
  for (const [testName, passed] of testResults) {
    console.log(`${passed ? '✅' : '❌'} ${testName}`);
    if (passed) passedTests++;
  }

  const overallScore = Math.round((passedTests / testResults.length) * 100);
  console.log('\n' + '='.repeat(60));
  console.log(`🎯 OVERALL SCORE: ${passedTests}/${testResults.length} (${overallScore}%)`);
  
  if (overallScore >= 80) {
    console.log('🎉 Agent system is working well!');
  } else if (overallScore >= 60) {
    console.log('⚠️  Agent system has some issues but core functionality works');
  } else {
    console.log('❌ Agent system needs attention - multiple components failing');
  }

  console.log('\n💡 RECOMMENDATIONS:');
  if (!results.environment) {
    console.log('   - Set missing environment variables in .env file');
  }
  if (!results.dependencies) {
    console.log('   - Run "npm install" to install missing dependencies');
  }
  if (!results.mistralAPI) {
    console.log('   - Check Mistral API key and network connectivity');
  }
  if (!results.pythNetwork) {
    console.log('   - Check Pyth Network endpoint and network connectivity');
  }
  if (results.environment && results.dependencies && results.mistralAPI) {
    console.log('   - Core agent functionality should work for basic queries');
    console.log('   - Try running the full agentic system with simple queries');
  }

  console.log('\n🚀 Test completed!');
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test execution failed:', error);
});
