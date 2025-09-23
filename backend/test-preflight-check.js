// Pre-flight Check Script for Analyze-Only Mode Testing
// This script validates the basic setup before running comprehensive tests

require('dotenv').config();
const axios = require('axios');
const https = require('https');

// Create axios instance with SSL fixes
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  }),
  timeout: 10000
});

console.log('🔍 PRE-FLIGHT CHECK FOR ANALYZE-ONLY MODE TESTING');
console.log('='.repeat(60));

async function runPreflightChecks() {
  let allChecksPass = true;
  const results = [];

  // Check 1: Environment Variables
  console.log('\n1. 🔑 Environment Variables Check');
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (mistralKey) {
    console.log(`   ✅ MISTRAL_API_KEY: ${mistralKey.substring(0, 8)}...${mistralKey.substring(mistralKey.length - 4)}`);
    results.push({ check: 'MISTRAL_API_KEY', status: 'PASS' });
  } else {
    console.log('   ❌ MISTRAL_API_KEY: Not found');
    results.push({ check: 'MISTRAL_API_KEY', status: 'FAIL', issue: 'Missing API key' });
    allChecksPass = false;
  }

  // Check 2: Node.js Dependencies
  console.log('\n2. 📦 Dependencies Check');
  try {
    require('axios');
    console.log('   ✅ axios: Available');
    results.push({ check: 'axios', status: 'PASS' });
  } catch (error) {
    console.log('   ❌ axios: Missing');
    results.push({ check: 'axios', status: 'FAIL', issue: 'Run npm install' });
    allChecksPass = false;
  }

  try {
    require('dotenv');
    console.log('   ✅ dotenv: Available');
    results.push({ check: 'dotenv', status: 'PASS' });
  } catch (error) {
    console.log('   ❌ dotenv: Missing');
    results.push({ check: 'dotenv', status: 'FAIL', issue: 'Run npm install' });
    allChecksPass = false;
  }

  // Check 3: Pyth Network Connectivity
  console.log('\n3. 🌐 Pyth Network Connectivity');
  try {
    const response = await axiosInstance.get('https://hermes.pyth.network/api/latest_price_feeds', {
      params: { 
        ids: ['0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace'] // ETH/USD
      }
    });
    
    if (response.status === 200 && response.data.length > 0) {
      const ethPrice = Number(response.data[0].price.price) * Math.pow(10, response.data[0].price.expo);
      console.log(`   ✅ Pyth Network: Connected (ETH: $${ethPrice.toFixed(2)})`);
      results.push({ check: 'Pyth Network', status: 'PASS', data: { ethPrice: ethPrice.toFixed(2) } });
    } else {
      console.log('   ⚠️  Pyth Network: Connected but no data');
      results.push({ check: 'Pyth Network', status: 'WARN', issue: 'No price data returned' });
    }
  } catch (error) {
    console.log(`   ⚠️  Pyth Network: ${error.message}`);
    console.log('   ℹ️  This is okay - test will use mock data');
    results.push({ check: 'Pyth Network', status: 'WARN', issue: error.message });
  }

  // Check 4: Mistral API Connectivity
  console.log('\n4. 🤖 Mistral API Connectivity');
  if (mistralKey) {
    try {
      const response = await axiosInstance.post(
        'https://api.mistral.ai/v1/chat/completions',
        {
          model: 'mistral-small',
          messages: [
            { role: 'user', content: 'Hello, this is a test. Please respond with just "OK".' }
          ],
          max_tokens: 10
        },
        {
          headers: {
            'Authorization': `Bearer ${mistralKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        console.log('   ✅ Mistral API: Connected and responding');
        results.push({ check: 'Mistral API', status: 'PASS' });
      } else {
        console.log(`   ❌ Mistral API: Unexpected response (${response.status})`);
        results.push({ check: 'Mistral API', status: 'FAIL', issue: `HTTP ${response.status}` });
        allChecksPass = false;
      }
    } catch (error) {
      console.log(`   ❌ Mistral API: ${error.message}`);
      if (error.response?.status === 401) {
        console.log('   ℹ️  Check your API key validity');
        results.push({ check: 'Mistral API', status: 'FAIL', issue: 'Invalid API key' });
      } else if (error.response?.status === 429) {
        console.log('   ℹ️  Rate limited - this is normal');
        results.push({ check: 'Mistral API', status: 'WARN', issue: 'Rate limited' });
      } else {
        results.push({ check: 'Mistral API', status: 'FAIL', issue: error.message });
      }
      allChecksPass = false;
    }
  } else {
    console.log('   ⏭️  Mistral API: Skipped (no API key)');
    results.push({ check: 'Mistral API', status: 'SKIP', issue: 'No API key' });
  }

  // Check 5: Port Availability
  console.log('\n5. 🔌 Port Availability Check');
  try {
    const testServer = require('http').createServer();
    await new Promise((resolve, reject) => {
      testServer.listen(3001, () => {
        console.log('   ✅ Port 3001: Available');
        results.push({ check: 'Port 3001', status: 'PASS' });
        testServer.close(resolve);
      });
      testServer.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.log('   ⚠️  Port 3001: In use (test will handle this)');
          results.push({ check: 'Port 3001', status: 'WARN', issue: 'Port in use' });
        } else {
          console.log(`   ❌ Port 3001: ${error.message}`);
          results.push({ check: 'Port 3001', status: 'FAIL', issue: error.message });
        }
        reject(error);
      });
    });
  } catch (error) {
    // Port in use is not a critical failure for our test
    if (error.code !== 'EADDRINUSE') {
      allChecksPass = false;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 PRE-FLIGHT CHECK SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log(`⏭️  Skipped: ${skipped}`);

  if (allChecksPass && failed === 0) {
    console.log('\n🎉 ALL CRITICAL CHECKS PASSED!');
    console.log('✅ Your system is ready for comprehensive analyze-only mode testing.');
    console.log('\n🚀 Next steps:');
    console.log('   1. Run: node test-analyze-only-comprehensive.js');
    console.log('   2. Review the detailed test results');
    console.log('   3. Check the generated test-results-analyze-only.json file');
  } else {
    console.log('\n⚠️  SOME CHECKS FAILED OR HAVE WARNINGS');
    console.log('📋 Issues to address:');
    
    results.filter(r => r.status === 'FAIL').forEach(result => {
      console.log(`   ❌ ${result.check}: ${result.issue}`);
    });

    results.filter(r => r.status === 'WARN').forEach(result => {
      console.log(`   ⚠️  ${result.check}: ${result.issue}`);
    });

    if (failed > 0) {
      console.log('\n🔧 Recommended actions:');
      console.log('   1. Fix the failed checks above');
      console.log('   2. Re-run this pre-flight check');
      console.log('   3. Then run the comprehensive test');
    } else {
      console.log('\n✅ Warnings are okay - you can proceed with testing');
      console.log('🚀 Run: node test-analyze-only-comprehensive.js');
    }
  }

  // Save results
  require('fs').writeFileSync(
    'preflight-check-results.json',
    JSON.stringify({ 
      timestamp: new Date().toISOString(),
      allChecksPass,
      summary: { passed, failed, warned, skipped },
      results 
    }, null, 2)
  );

  console.log('\n📄 Detailed results saved to: preflight-check-results.json');
}

// Run the checks
runPreflightChecks().catch(error => {
  console.error('\n❌ Pre-flight check failed:', error.message);
  process.exit(1);
});
