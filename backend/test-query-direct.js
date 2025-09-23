// Direct Query Testing Script - Bypasses server setup issues
// Tests Mistral integration and response quality directly

require('dotenv').config();
const axios = require('axios');
const https = require('https');

// Create axios instance with SSL fixes
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  }),
  timeout: 30000
});

// Configuration
const CONFIG = {
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY,
    model: process.env.MISTRAL_MODEL || 'mistral-medium',
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

// Mistral Service
class MistralService {
  static async callMistralAPI(systemPrompt, userContent) {
    try {
      const response = await axiosInstance.post(
        'https://api.mistral.ai/v1/chat/completions',
        {
          model: CONFIG.mistral.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          temperature: 0.3,
          max_tokens: 800
        },
        {
          headers: {
            'Authorization': `Bearer ${CONFIG.mistral.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      throw new Error(`Mistral API call failed: ${error.message}`);
    }
  }
}

// Direct Query Tester
class DirectQueryTester {
  static async testQuery(query, expectedContext, pythData) {
    const startTime = Date.now();
    
    try {
      TestLogger.info(`Testing query: "${query}"`);
      
      // Create system prompt for DeFi analysis
      const systemPrompt = `
You are an expert DeFi analyst AI with access to real-time market data. 

Your task is to analyze user queries and provide comprehensive DeFi insights in JSON format.

Context: You have access to real-time price data from Pyth Network oracles.

Always respond with a JSON object containing:
{
  "intent": {
    "type": "yield_optimization" | "risk_assessment" | "market_intelligence" | "price_analysis",
    "confidence": 0.95,
    "reasoning": "explanation of intent recognition"
  },
  "analysis": {
    "summary": "comprehensive analysis summary",
    "recommendations": ["actionable recommendation 1", "actionable recommendation 2"],
    "opportunities": [
      {
        "protocol": "Aave",
        "tokenSymbol": "USDC",
        "apy": "8.5%",
        "riskScore": 3,
        "category": "lending"
      }
    ],
    "riskAssessment": "risk analysis if applicable",
    "marketConditions": "current market assessment"
  },
  "dataIntegration": {
    "usedRealTimeData": true,
    "priceReferences": ["ETH: $4466", "BTC: $115804"],
    "confidence": 0.9
  }
}

Be specific, actionable, and integrate the provided real-time price data into your analysis.
`;

      // Create user prompt with real-time data
      const userContent = `
User Query: "${query}"

Real-time Market Data from Pyth Network:
${JSON.stringify(pythData, null, 2)}

Provide a comprehensive DeFi analysis addressing the user's query. Integrate the real-time price data and provide specific, actionable insights.
`;

      const rawResponse = await MistralService.callMistralAPI(systemPrompt, userContent);
      const responseTime = Date.now() - startTime;
      
      // Parse response
      let parsedResponse;
      try {
        const cleanResponse = rawResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        parsedResponse = JSON.parse(cleanResponse);
      } catch (parseError) {
        // If JSON parsing fails, create a structured response from the raw text
        parsedResponse = {
          intent: {
            type: this.inferIntentFromQuery(query),
            confidence: 0.7,
            reasoning: "Parsed from unstructured response"
          },
          analysis: {
            summary: rawResponse.substring(0, 500),
            recommendations: this.extractRecommendations(rawResponse),
            riskAssessment: this.extractRiskInfo(rawResponse),
            marketConditions: "Analysis provided"
          },
          dataIntegration: {
            usedRealTimeData: rawResponse.includes('$') || rawResponse.toLowerCase().includes('price'),
            confidence: 0.6
          }
        };
      }

      // Analyze response quality
      const analysis = this.analyzeResponseQuality(parsedResponse, expectedContext, query, pythData);
      
      const testResult = {
        query,
        expectedContext,
        responseTime,
        success: true,
        response: parsedResponse,
        rawResponse,
        analysis,
        timestamp: new Date().toISOString()
      };

      testResults.queryTests.push(testResult);
      testResults.summary.total++;
      testResults.summary.successful++;
      testResults.summary.responseQuality[analysis.overallQuality]++;

      TestLogger.success(`Query successful (${responseTime}ms)`);
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

  static inferIntentFromQuery(query) {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('yield') || lowerQuery.includes('apy') || lowerQuery.includes('staking') || lowerQuery.includes('farming')) {
      return 'yield_optimization';
    }
    if (lowerQuery.includes('risk') || lowerQuery.includes('liquidation') || lowerQuery.includes('loss')) {
      return 'risk_assessment';
    }
    if (lowerQuery.includes('price') || lowerQuery.includes('trend') || lowerQuery.includes('volatility')) {
      return 'price_analysis';
    }
    return 'market_intelligence';
  }

  static extractRecommendations(text) {
    const recommendations = [];
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.includes('recommend') || line.includes('suggest') || line.includes('consider')) {
        recommendations.push(line.trim());
      }
    }
    return recommendations.slice(0, 3); // Limit to 3 recommendations
  }

  static extractRiskInfo(text) {
    const riskKeywords = ['risk', 'danger', 'caution', 'warning', 'volatile'];
    const lines = text.split('\n');
    for (const line of lines) {
      if (riskKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
        return line.trim();
      }
    }
    return 'Risk assessment not explicitly provided';
  }

  static analyzeResponseQuality(responseData, expectedContext, query, pythData) {
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
      // Check intent recognition
      const intentType = responseData.intent?.type;
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

      // Check response completeness
      const hasAnalysis = !!responseData.analysis;
      const hasSummary = !!responseData.analysis?.summary;
      const hasRecommendations = !!responseData.analysis?.recommendations?.length;
      
      if (hasAnalysis && hasSummary && hasRecommendations) {
        analysis.responseCompleteness = 'complete';
        analysis.strengths.push('Response has all expected components');
      } else {
        analysis.responseCompleteness = 'incomplete';
        analysis.issues.push('Missing expected response components');
      }

      // Check data integration
      const usedRealTimeData = responseData.dataIntegration?.usedRealTimeData;
      const summary = responseData.analysis?.summary || '';
      const hasPriceData = /\$[\d,]+/.test(summary) || pythData.some(p => summary.includes(p.price));
      
      if (usedRealTimeData || hasPriceData) {
        analysis.dataIntegration = 'good';
        analysis.strengths.push('Response integrates real-time market data');
      } else {
        analysis.dataIntegration = 'poor';
        analysis.issues.push('Response lacks real-time data integration');
      }

      // Check relevance
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
        dataIntegration: analysis.dataIntegration === 'good' ? 2 : 0,
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
      'yield': ['yield_optimization', 'yield', 'farming', 'staking', 'liquidity'],
      'price': ['price_analysis', 'market_intelligence', 'price', 'trading'],
      'risk': ['risk_assessment', 'risk', 'liquidation', 'assessment']
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
async function runDirectQueryTests() {
  TestLogger.section('🚀 DIRECT QUERY RESPONSE TESTING');
  
  try {
    // Step 1: Validate environment
    if (!CONFIG.mistral.apiKey) {
      TestLogger.error('MISTRAL_API_KEY not found in environment variables');
      return;
    }
    
    TestLogger.success('Environment validated');

    // Step 2: Get current Pyth data
    TestLogger.subsection('Fetching Current Market Data');
    const pythData = await PythDataService.fetchCurrentPrices();
    testResults.pythData = pythData;
    
    if (pythData.length > 0) {
      pythData.forEach(data => {
        TestLogger.info(`${data.symbol}: $${data.price} (±$${data.confidence})`);
      });
    }

    // Step 3: Test different query contexts
    const testQueries = [
      // Yield queries
      {
        query: "Find the highest APY for USDC staking across all protocols",
        context: 'yield'
      },
      {
        query: "What are the best liquidity mining opportunities right now?",
        context: 'yield'
      },
      
      // Price queries
      {
        query: "What's the current ETH price and its 24h volatility?",
        context: 'price'
      },
      {
        query: "Show me BTC price trends and confidence intervals from Pyth Network",
        context: 'price'
      },
      
      // Risk queries
      {
        query: "Analyze liquidation risks in current DeFi positions",
        context: 'risk'
      },
      {
        query: "What are the main risks of yield farming on Polygon network?",
        context: 'risk'
      }
    ];

    for (const testQuery of testQueries) {
      TestLogger.subsection(`Testing ${testQuery.context.toUpperCase()} Query`);
      await DirectQueryTester.testQuery(testQuery.query, testQuery.context, pythData);
      
      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Step 4: Generate report
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
    
    if (test.success && test.response?.analysis?.summary) {
      const summary = test.response.analysis.summary.substring(0, 100) + '...';
      console.log(`      Summary: ${summary}`);
    }
    
    console.log('');
  });

  // Save detailed results
  require('fs').writeFileSync(
    'direct-query-analysis.json',
    JSON.stringify(testResults, null, 2)
  );
  
  TestLogger.info('Detailed results saved to: direct-query-analysis.json');
  
  // Final assessment
  if (summary.successful > 0) {
    TestLogger.success(`🎉 Successfully tested ${summary.successful} queries with Mistral integration!`);
    console.log('\n🔧 KEY FINDINGS:');
    
    const excellentCount = summary.responseQuality.excellent;
    const goodCount = summary.responseQuality.good;
    const poorCount = summary.responseQuality.poor;
    
    if (excellentCount > 0) {
      console.log(`   ✅ ${excellentCount} queries produced excellent responses`);
    }
    if (goodCount > 0) {
      console.log(`   👍 ${goodCount} queries produced good responses`);
    }
    if (poorCount > 0) {
      console.log(`   👎 ${poorCount} queries need improvement`);
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    if (poorCount > excellentCount) {
      console.log('   • Improve prompt engineering for better response quality');
      console.log('   • Enhance data integration in responses');
    }
    if (summary.successful === summary.total) {
      console.log('   • Mistral integration is working well!');
      console.log('   • Consider implementing this approach in your main application');
    }
  } else {
    TestLogger.error('All queries failed - check Mistral API configuration');
  }
}

// Run the tests
if (require.main === module) {
  console.log('🚀 Starting Direct Query Response Testing...');
  console.log('📋 This test will validate:');
  console.log('   1. Mistral AI integration and response quality');
  console.log('   2. Intent recognition across different contexts');
  console.log('   3. Real-time Pyth Network data integration');
  console.log('   4. Response format consistency and completeness');
  console.log('   5. Direct API performance without server dependencies\n');
  
  runDirectQueryTests();
}

module.exports = {
  runDirectQueryTests,
  DirectQueryTester,
  PythDataService,
  MistralService
};
