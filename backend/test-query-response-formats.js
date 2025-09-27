// Query Response Format Testing Script
// Tests different query contexts: yield, price feeds, risk assessment
// Validates Mistral integration and agent response quality

require('dotenv').config();
const axios = require('axios');
const https = require('https');

// Configuration
const CONFIG = {
  server: {
    port: process.env.PORT || 3000,
    host: 'localhost',
  },
  pyth: {
    endpoint: 'https://hermes.pyth.network',
    priceFeeds: {
      'ETH/USD': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
      'BTC/USD': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
      'USDC/USD': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
    }
  }
};

// Create axios instance with SSL fixes
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  }),
  timeout: 30000
});

// Test Results Storage
const testResults = {
  timestamp: new Date().toISOString(),
  pythData: null,
  queryTests: [],
  summary: {
    total: 0,
    successful: 0,
    failed: 0,
    responseQuality: {
      excellent: 0,
      good: 0,
      poor: 0
    }
  }
};

// Utility Functions
class TestLogger {
  static info(message) {
    console.log(`ℹ️  ${message}`);
  }

  static success(message) {
    console.log(`✅ ${message}`);
  }

  static error(message) {
    console.log(`❌ ${message}`);
  }

  static warn(message) {
    console.log(`⚠️  ${message}`);
  }

  static section(title) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 ${title}`);
    console.log(`${'='.repeat(80)}`);
  }

  static subsection(title) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📊 ${title}`);
    console.log(`${'─'.repeat(60)}`);
  }
}

// Pyth Data Service
class PythDataService {
  static async fetchCurrentPrices() {
    try {
      const feedIds = Object.values(CONFIG.pyth.priceFeeds);
      
      const response = await axiosInstance.get(`${CONFIG.pyth.endpoint}/api/latest_price_feeds`, {
        params: { ids: feedIds }
      });

      const priceData = response.data.map(feed => {
        const price = Number(feed.price.price) * Math.pow(10, feed.price.expo);
        const confidence = Number(feed.price.conf) * Math.pow(10, feed.price.expo);
        const symbol = Object.keys(CONFIG.pyth.priceFeeds).find(
          key => CONFIG.pyth.priceFeeds[key] === feed.id
        );

        return {
          symbol,
          price: Number.isFinite(price) ? price.toFixed(6) : null,
          confidence: Number.isFinite(confidence) ? confidence.toFixed(6) : null,
          timestamp: new Date(feed.price.publish_time * 1000).toISOString(),
          feedId: feed.id,
        };
      });

      TestLogger.success(`Fetched ${priceData.length} price feeds from Pyth Network`);
      return priceData;
    } catch (error) {
      TestLogger.error(`Failed to fetch Pyth prices: ${error.message}`);
      return [];
    }
  }
}

// Query Test Cases
class QueryResponseTester {
  static async testQuery(query, expectedContext, userProfile = null) {
    const startTime = Date.now();
    
    try {
      TestLogger.info(`Testing query: "${query}"`);
      
      const requestBody = {
        query,
        mode: 'analyze_only',
        userProfile
      };

      const response = await axiosInstance.post(
        `http://${CONFIG.server.host}:${CONFIG.server.port}/api/query`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const responseTime = Date.now() - startTime;
      
      // Analyze response quality
      const analysis = this.analyzeResponseQuality(response.data, expectedContext, query);
      
      const testResult = {
        query,
        expectedContext,
        responseTime,
        success: response.status === 200,
        response: response.data,
        analysis,
        timestamp: new Date().toISOString()
      };

      testResults.queryTests.push(testResult);
      testResults.summary.total++;
      
      if (testResult.success) {
        testResults.summary.successful++;
        TestLogger.success(`Query successful (${responseTime}ms)`);
      } else {
        testResults.summary.failed++;
        TestLogger.error(`Query failed (${responseTime}ms)`);
      }

      // Update quality metrics
      testResults.summary.responseQuality[analysis.overallQuality]++;

      // Display analysis
      this.displayResponseAnalysis(analysis);
      
      return testResult;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      TestLogger.error(`Query failed: ${error.message} (${responseTime}ms)`);
      
      const testResult = {
        query,
        expectedContext,
        responseTime,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      testResults.queryTests.push(testResult);
      testResults.summary.total++;
      testResults.summary.failed++;
      
      return testResult;
    }
  }

  static analyzeResponseQuality(responseData, expectedContext, query) {
    const analysis = {
      intentRecognition: 'unknown',
      dataIntegration: 'unknown',
      responseCompleteness: 'unknown',
      relevance: 'unknown',
      overallQuality: 'poor',
      issues: [],
      strengths: [],
      detailedAnalysis: {}
    };

    try {
      // Check if response is successful
      if (!responseData.success) {
        analysis.issues.push('API response indicates failure');
        return analysis;
      }

      // Analyze intent recognition
      const intentType = responseData.data?.intent?.type || responseData.data?.routing?.primaryAgent;
      if (intentType) {
        const contextMatch = this.checkContextMatch(intentType, expectedContext);
        analysis.intentRecognition = contextMatch ? 'correct' : 'incorrect';
        analysis.detailedAnalysis.recognizedIntent = intentType;
        
        if (contextMatch) {
          analysis.strengths.push(`Correctly identified ${expectedContext} context`);
        } else {
          analysis.issues.push(`Expected ${expectedContext} context, got ${intentType}`);
        }
      } else {
        analysis.issues.push('No intent recognition found in response');
      }

      // Check response structure completeness
      const hasResults = !!responseData.data?.results;
      const hasSummary = !!responseData.data?.results?.summary;
      const hasRecommendations = !!responseData.data?.results?.recommendations;
      
      if (hasResults && hasSummary && hasRecommendations) {
        analysis.responseCompleteness = 'complete';
        analysis.strengths.push('Response has all expected components');
      } else {
        analysis.responseCompleteness = 'incomplete';
        analysis.issues.push('Missing expected response components');
      }

      // Analyze data integration (check if response mentions current prices/data)
      const summary = responseData.data?.results?.summary || '';
      const hasPriceData = /\$[\d,]+/.test(summary) || /price/i.test(summary);
      const hasCurrentData = /current/i.test(summary) || /real-time/i.test(summary);
      
      if (hasPriceData || hasCurrentData) {
        analysis.dataIntegration = 'good';
        analysis.strengths.push('Response integrates current market data');
      } else {
        analysis.dataIntegration = 'poor';
        analysis.issues.push('Response lacks current market data integration');
      }

      // Check relevance to query
      const queryWords = query.toLowerCase().split(' ');
      const summaryWords = summary.toLowerCase();
      const relevantWords = queryWords.filter(word => 
        word.length > 3 && summaryWords.includes(word)
      );
      
      if (relevantWords.length >= queryWords.length * 0.3) {
        analysis.relevance = 'high';
        analysis.strengths.push('Response is highly relevant to query');
      } else if (relevantWords.length > 0) {
        analysis.relevance = 'medium';
        analysis.strengths.push('Response has some relevance to query');
      } else {
        analysis.relevance = 'low';
        analysis.issues.push('Response lacks relevance to query');
      }

      // Calculate overall quality
      const scores = {
        intentRecognition: analysis.intentRecognition === 'correct' ? 2 : 0,
        dataIntegration: analysis.dataIntegration === 'good' ? 2 : analysis.dataIntegration === 'poor' ? 0 : 1,
        responseCompleteness: analysis.responseCompleteness === 'complete' ? 2 : 0,
        relevance: analysis.relevance === 'high' ? 2 : analysis.relevance === 'medium' ? 1 : 0
      };

      const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
      const maxScore = 8;

      if (totalScore >= 7) {
        analysis.overallQuality = 'excellent';
      } else if (totalScore >= 4) {
        analysis.overallQuality = 'good';
      } else {
        analysis.overallQuality = 'poor';
      }

      analysis.detailedAnalysis.scores = scores;
      analysis.detailedAnalysis.totalScore = totalScore;
      analysis.detailedAnalysis.maxScore = maxScore;

    } catch (error) {
      analysis.issues.push(`Analysis error: ${error.message}`);
    }

    return analysis;
  }

  static checkContextMatch(intentType, expectedContext) {
    const contextMappings = {
      'yield': ['YIELD', 'yield', 'farming', 'staking', 'liquidity'],
      'price': ['MARKET', 'price', 'trading', 'intelligence'],
      'risk': ['RISK', 'risk', 'liquidation', 'assessment']
    };

    const expectedKeywords = contextMappings[expectedContext] || [];
    return expectedKeywords.some(keyword => 
      intentType.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  static displayResponseAnalysis(analysis) {
    console.log(`   🎯 Intent Recognition: ${analysis.intentRecognition}`);
    console.log(`   📊 Data Integration: ${analysis.dataIntegration}`);
    console.log(`   📋 Completeness: ${analysis.responseCompleteness}`);
    console.log(`   🔍 Relevance: ${analysis.relevance}`);
    console.log(`   ⭐ Overall Quality: ${analysis.overallQuality}`);
    
    if (analysis.strengths.length > 0) {
      console.log(`   ✅ Strengths: ${analysis.strengths.join(', ')}`);
    }
    
    if (analysis.issues.length > 0) {
      console.log(`   ❌ Issues: ${analysis.issues.join(', ')}`);
    }
  }
}

// Main Test Runner
async function runQueryResponseTests() {
  TestLogger.section('🚀 QUERY RESPONSE FORMAT TESTING');
  
  try {
    // Step 1: Get current Pyth data for context
    TestLogger.subsection('Fetching Current Market Data');
    const pythData = await PythDataService.fetchCurrentPrices();
    testResults.pythData = pythData;
    
    if (pythData.length > 0) {
      pythData.forEach(data => {
        TestLogger.info(`${data.symbol}: $${data.price} (±$${data.confidence})`);
      });
    }

    // Step 2: Test Yield-Related Queries
    TestLogger.subsection('🌾 YIELD-RELATED QUERIES');
    
    await QueryResponseTester.testQuery(
      "Find the highest APY for USDC staking across all protocols",
      'yield',
      {
        riskTolerance: 'medium',
        experienceLevel: 'intermediate',
        portfolioSize: 'medium',
        preferredProtocols: ['aave', 'compound', 'uniswap']
      }
    );

    await QueryResponseTester.testQuery(
      "Compare yield farming returns between Aave and Compound for ETH",
      'yield',
      {
        riskTolerance: 'low',
        experienceLevel: 'beginner',
        portfolioSize: 'small'
      }
    );

    await QueryResponseTester.testQuery(
      "What are the best liquidity mining opportunities right now?",
      'yield'
    );

    // Step 3: Test Price Feed Queries
    TestLogger.subsection('💰 PRICE FEED QUERIES');
    
    await QueryResponseTester.testQuery(
      "What's the current ETH price and its 24h volatility?",
      'price'
    );

    await QueryResponseTester.testQuery(
      "Show me BTC price trends and confidence intervals from Pyth Network",
      'price'
    );

    await QueryResponseTester.testQuery(
      "Compare current crypto prices with historical averages",
      'price'
    );

    // Step 4: Test Risk Assessment Queries
    TestLogger.subsection('⚠️ RISK ASSESSMENT QUERIES');
    
    await QueryResponseTester.testQuery(
      "Analyze liquidation risks in current DeFi positions",
      'risk',
      {
        riskTolerance: 'high',
        experienceLevel: 'expert',
        portfolioSize: 'large'
      }
    );

    await QueryResponseTester.testQuery(
      "What are the main risks of yield farming on Polygon network?",
      'risk',
      {
        riskTolerance: 'medium',
        preferredChains: ['polygon']
      }
    );

    await QueryResponseTester.testQuery(
      "Assess impermanent loss risks for ETH/USDC liquidity pools",
      'risk'
    );

    // Step 5: Generate Final Report
    generateDetailedReport();
    
  } catch (error) {
    TestLogger.error(`Test suite failed: ${error.message}`);
  }
}

function generateDetailedReport() {
  TestLogger.section('📊 DETAILED QUERY RESPONSE ANALYSIS');
  
  const { summary } = testResults;
  
  console.log(`
🎯 TEST SUMMARY:
   Total Queries: ${summary.total}
   ✅ Successful: ${summary.successful}
   ❌ Failed: ${summary.failed}
   📈 Success Rate: ${summary.total > 0 ? ((summary.successful / summary.total) * 100).toFixed(1) : 0}%

⭐ RESPONSE QUALITY DISTRIBUTION:
   🌟 Excellent: ${summary.responseQuality.excellent}
   👍 Good: ${summary.responseQuality.good}
   👎 Poor: ${summary.responseQuality.poor}

📋 DETAILED QUERY ANALYSIS:
`);

  testResults.queryTests.forEach((test, index) => {
    const status = test.success ? '✅' : '❌';
    const quality = test.analysis?.overallQuality || 'unknown';
    const qualityIcon = quality === 'excellent' ? '🌟' : quality === 'good' ? '👍' : '👎';
    
    console.log(`   ${index + 1}. ${status} ${qualityIcon} "${test.query}"`);
    console.log(`      Context: ${test.expectedContext} | Quality: ${quality} | Time: ${test.responseTime}ms`);
    
    if (test.analysis?.detailedAnalysis?.recognizedIntent) {
      console.log(`      Recognized Intent: ${test.analysis.detailedAnalysis.recognizedIntent}`);
    }
    
    if (test.analysis?.issues?.length > 0) {
      console.log(`      Issues: ${test.analysis.issues.join(', ')}`);
    }
    console.log('');
  });

  // Context-specific analysis
  const contextAnalysis = analyzeByContext();
  
  console.log(`📊 CONTEXT-SPECIFIC PERFORMANCE:`);
  Object.entries(contextAnalysis).forEach(([context, stats]) => {
    console.log(`   ${context.toUpperCase()}:`);
    console.log(`     Success Rate: ${stats.successRate}%`);
    console.log(`     Avg Quality: ${stats.avgQuality}`);
    console.log(`     Avg Response Time: ${stats.avgResponseTime}ms`);
  });

  // Save detailed results
  require('fs').writeFileSync(
    'query-response-analysis.json',
    JSON.stringify(testResults, null, 2)
  );
  
  TestLogger.info('Detailed results saved to: query-response-analysis.json');
  
  // Final recommendations
  console.log(`\n🔧 RECOMMENDATIONS:`);
  generateRecommendations();
}

function analyzeByContext() {
  const contexts = ['yield', 'price', 'risk'];
  const analysis = {};
  
  contexts.forEach(context => {
    const contextTests = testResults.queryTests.filter(test => test.expectedContext === context);
    
    if (contextTests.length > 0) {
      const successful = contextTests.filter(test => test.success).length;
      const successRate = ((successful / contextTests.length) * 100).toFixed(1);
      
      const qualityScores = contextTests
        .filter(test => test.analysis?.detailedAnalysis?.totalScore)
        .map(test => test.analysis.detailedAnalysis.totalScore);
      
      const avgQuality = qualityScores.length > 0 
        ? (qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length).toFixed(1)
        : 'N/A';
      
      const avgResponseTime = contextTests.length > 0
        ? Math.round(contextTests.reduce((sum, test) => sum + test.responseTime, 0) / contextTests.length)
        : 0;
      
      analysis[context] = {
        successRate,
        avgQuality,
        avgResponseTime,
        totalTests: contextTests.length
      };
    }
  });
  
  return analysis;
}

function generateRecommendations() {
  const issues = [];
  const strengths = [];
  
  testResults.queryTests.forEach(test => {
    if (test.analysis?.issues) {
      issues.push(...test.analysis.issues);
    }
    if (test.analysis?.strengths) {
      strengths.push(...test.analysis.strengths);
    }
  });
  
  // Count common issues
  const issueCount = {};
  issues.forEach(issue => {
    issueCount[issue] = (issueCount[issue] || 0) + 1;
  });
  
  // Top issues
  const topIssues = Object.entries(issueCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);
  
  if (topIssues.length > 0) {
    console.log(`   🔴 Top Issues to Address:`);
    topIssues.forEach(([issue, count]) => {
      console.log(`     • ${issue} (${count} occurrences)`);
    });
  }
  
  // Success patterns
  const strengthCount = {};
  strengths.forEach(strength => {
    strengthCount[strength] = (strengthCount[strength] || 0) + 1;
  });
  
  const topStrengths = Object.entries(strengthCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);
  
  if (topStrengths.length > 0) {
    console.log(`   🟢 Working Well:`);
    topStrengths.forEach(([strength, count]) => {
      console.log(`     • ${strength} (${count} occurrences)`);
    });
  }
  
  // Specific recommendations
  console.log(`   💡 Specific Recommendations:`);
  
  if (testResults.summary.responseQuality.poor > testResults.summary.responseQuality.excellent) {
    console.log(`     • Improve prompt engineering in AgenticPromptService`);
    console.log(`     • Enhance intent recognition in SemanticRouterService`);
  }
  
  if (testResults.summary.failed > 0) {
    console.log(`     • Check server connectivity and error handling`);
    console.log(`     • Validate API endpoint configurations`);
  }
  
  const avgResponseTime = testResults.queryTests.length > 0
    ? testResults.queryTests.reduce((sum, test) => sum + test.responseTime, 0) / testResults.queryTests.length
    : 0;
  
  if (avgResponseTime > 10000) {
    console.log(`     • Optimize response times (current avg: ${Math.round(avgResponseTime)}ms)`);
    console.log(`     • Consider caching frequently requested data`);
  }
}

// Run the tests
if (require.main === module) {
  console.log('🚀 Starting Query Response Format Testing...');
  console.log('📋 This test will validate:');
  console.log('   1. Intent recognition across different contexts');
  console.log('   2. Mistral AI integration and response quality');
  console.log('   3. Pyth Network data integration');
  console.log('   4. Response format consistency and completeness');
  console.log('   5. Performance metrics and recommendations\n');
  
  runQueryResponseTests();
}

module.exports = {
  runQueryResponseTests,
  QueryResponseTester,
  PythDataService,
  CONFIG
};
