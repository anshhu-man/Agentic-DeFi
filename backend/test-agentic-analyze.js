const AgenticOrchestrator = require('./src/services/AgenticOrchestrator').default;

async function testAgenticAnalyzeMode() {
  console.log('🚀 Testing Agentic Analyze-Only Mode\n');

  const orchestrator = new AgenticOrchestrator();

  // Test queries for different intents
  const testQueries = [
    {
      name: 'Yield Optimization Query',
      query: 'Find me the best USDC yield opportunities on Polygon with low risk',
      userProfile: {
        riskTolerance: 'low',
        experienceLevel: 'intermediate',
        portfolioSize: 'medium',
        preferredChains: ['polygon'],
        preferredProtocols: ['aave', 'compound'],
      },
    },
    {
      name: 'Risk Assessment Query',
      query: 'Analyze the risk of my current DeFi positions and check for liquidation danger',
      userProfile: {
        riskTolerance: 'medium',
        experienceLevel: 'expert',
        portfolioSize: 'large',
        preferredChains: ['ethereum', 'polygon'],
        preferredProtocols: ['aave', 'uniswap'],
      },
    },
    {
      name: 'Market Intelligence Query',
      query: 'What are the current DeFi market conditions and trends?',
      userProfile: {
        riskTolerance: 'high',
        experienceLevel: 'expert',
        portfolioSize: 'large',
        preferredChains: ['ethereum'],
        preferredProtocols: ['uniswap', 'curve'],
      },
    },
    {
      name: 'Cross-Chain Analysis Query',
      query: 'Compare yield farming opportunities between Ethereum and Polygon',
      userProfile: {
        riskTolerance: 'medium',
        experienceLevel: 'intermediate',
        portfolioSize: 'medium',
        preferredChains: ['ethereum', 'polygon'],
        preferredProtocols: ['aave', 'uniswap'],
      },
    },
    {
      name: 'Simple Query',
      query: 'Show me some good DeFi opportunities',
    },
  ];

  for (const testCase of testQueries) {
    console.log(`\n📊 Testing: ${testCase.name}`);
    console.log(`Query: "${testCase.query}"`);
    console.log('─'.repeat(80));

    try {
      const request = {
        query: testCase.query,
        userProfile: testCase.userProfile,
        mode: 'analyze_only',
      };

      const startTime = Date.now();
      const response = await orchestrator.processRequest(request);
      const executionTime = Date.now() - startTime;

      console.log(`✅ Success: ${response.success}`);
      console.log(`⏱️  Execution Time: ${executionTime}ms`);
      
      // Semantic Analysis Results
      console.log('\n🧠 Semantic Analysis:');
      console.log(`  Intent: ${response.semanticAnalysis.primary.type}`);
      console.log(`  Confidence: ${Math.round(response.semanticAnalysis.primary.confidence * 100)}%`);
      console.log(`  Complexity: ${response.semanticAnalysis.secondary.complexity}/10`);
      console.log(`  Urgency: ${response.semanticAnalysis.secondary.urgency}`);
      console.log(`  Risk Tolerance: ${response.semanticAnalysis.secondary.riskTolerance}`);
      console.log(`  Reasoning: ${response.semanticAnalysis.primary.reasoning}`);

      // Agent Routing Results
      console.log('\n🎯 Agent Routing:');
      console.log(`  Primary Agent: ${response.routingPlan.primaryAgent.name}`);
      console.log(`  Agent Confidence: ${Math.round(response.routingPlan.primaryAgent.confidence * 100)}%`);
      console.log(`  Supporting Agents: ${response.routingPlan.supportingAgents.length}`);
      console.log(`  Coordination: ${response.routingPlan.coordinationStrategy}`);
      console.log(`  Execution Order: ${response.routingPlan.executionOrder.join(' → ')}`);

      // Agent Execution Results
      console.log('\n🤖 Agent Execution:');
      console.log(`  Agents Used: ${response.metadata.agentsUsed.join(', ')}`);
      console.log(`  Successful Agents: ${response.agentResponses.filter(r => r.success).length}/${response.agentResponses.length}`);
      
      if (response.metadata.fallbacksTriggered.length > 0) {
        console.log(`  Fallbacks Triggered: ${response.metadata.fallbacksTriggered.join(', ')}`);
      }

      // Final Results
      console.log('\n📋 Results:');
      console.log(`  Summary: ${response.synthesizedResponse.summary}`);
      console.log(`  Overall Confidence: ${Math.round(response.synthesizedResponse.confidence * 100)}%`);
      
      if (response.synthesizedResponse.opportunities && response.synthesizedResponse.opportunities.length > 0) {
        console.log(`  Opportunities Found: ${response.synthesizedResponse.opportunities.length}`);
        response.synthesizedResponse.opportunities.slice(0, 2).forEach((opp, index) => {
          console.log(`    ${index + 1}. ${opp.protocol} - ${opp.tokenSymbol} (${opp.apy}% APY, Risk: ${opp.riskScore}/10)`);
        });
      }

      if (response.synthesizedResponse.recommendations.length > 0) {
        console.log(`  Recommendations: ${response.synthesizedResponse.recommendations.length}`);
        response.synthesizedResponse.recommendations.slice(0, 3).forEach((rec, index) => {
          console.log(`    ${index + 1}. ${rec}`);
        });
      }

      if (response.synthesizedResponse.nextSteps.length > 0) {
        console.log(`  Next Steps: ${response.synthesizedResponse.nextSteps.length}`);
        response.synthesizedResponse.nextSteps.slice(0, 2).forEach((step, index) => {
          console.log(`    ${index + 1}. ${step}`);
        });
      }

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log(`Stack: ${error.stack}`);
    }

    console.log('\n' + '='.repeat(80));
  }

  console.log('\n🎉 Agentic Analyze-Only Mode Testing Complete!');
}

// Test semantic analysis only
async function testSemanticAnalysisOnly() {
  console.log('\n🔍 Testing Semantic Analysis Only\n');

  const SemanticRouterService = require('./src/services/SemanticRouterService').default;
  const router = new SemanticRouterService();

  const testQueries = [
    'Find me high yield USDC opportunities',
    'My portfolio is at risk of liquidation',
    'Show me governance proposals I can vote on',
    'Compare yields between Ethereum and Polygon',
    'What are the current market conditions?',
  ];

  for (const query of testQueries) {
    console.log(`Query: "${query}"`);
    
    try {
      const semanticAnalysis = await router.analyzeSemanticIntent(query);
      const routingPlan = await router.routeToAgents(semanticAnalysis);

      console.log(`  Intent: ${semanticAnalysis.primary.type} (${Math.round(semanticAnalysis.primary.confidence * 100)}%)`);
      console.log(`  Primary Agent: ${routingPlan.primaryAgent.name}`);
      console.log(`  Entities: Tokens(${semanticAnalysis.entities.tokens.length}), Protocols(${semanticAnalysis.entities.protocols.length}), Chains(${semanticAnalysis.entities.chains.length})`);
      console.log('');
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
  }
}

// Run tests
async function runTests() {
  try {
    await testSemanticAnalysisOnly();
    await testAgenticAnalyzeMode();
  } catch (error) {
    console.error('Test execution failed:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testAgenticAnalyzeMode, testSemanticAnalysisOnly };
