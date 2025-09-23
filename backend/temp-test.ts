
import { AgenticOrchestrator } from './src/services/AgenticOrchestrator';
import { SemanticRouterService } from './src/services/SemanticRouterService';

async function testAgenticAnalyzeMode() {
  console.log('🚀 Testing Agentic Analyze-Only Mode\n');

  try {
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
        
        if (response.semanticAnalysis) {
          console.log('\n🧠 Semantic Analysis:');
          console.log(`  Intent: ${response.semanticAnalysis.primary?.type || 'unknown'}`);
          console.log(`  Confidence: ${Math.round((response.semanticAnalysis.primary?.confidence || 0) * 100)}%`);
        }

        if (response.routingPlan) {
          console.log('\n🎯 Agent Routing:');
          console.log(`  Primary Agent: ${response.routingPlan.primaryAgent?.name || 'unknown'}`);
        }

        console.log('\n📋 Results:');
        console.log(`  Summary: ${response.synthesizedResponse?.summary || 'No summary available'}`);

      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        console.log(`Stack: ${error.stack}`);
      }

      console.log('\n' + '='.repeat(80));
    }

    console.log('\n🎉 Agentic Analyze-Only Mode Testing Complete!');
  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
    console.error('This might be due to missing dependencies or configuration issues.');
  }
}

// Test semantic analysis only
async function testSemanticAnalysisOnly() {
  console.log('\n🔍 Testing Semantic Analysis Only\n');

  try {
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

        console.log(`  Intent: ${semanticAnalysis.primary?.type || 'unknown'} (${Math.round((semanticAnalysis.primary?.confidence || 0) * 100)}%)`);
        console.log(`  Primary Agent: ${routingPlan.primaryAgent?.name || 'unknown'}`);
        console.log(`  Entities: Tokens(${semanticAnalysis.entities?.tokens?.length || 0}), Protocols(${semanticAnalysis.entities?.protocols?.length || 0}), Chains(${semanticAnalysis.entities?.chains?.length || 0})`);
        console.log('');
      } catch (error) {
        console.log(`  Error: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Semantic analysis test failed:', error.message);
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

runTests();
