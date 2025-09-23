// Fixed version of the test script that works with ts-node
const { execSync } = require('child_process');
const path = require('path');

async function runTestWithTsNode() {
  console.log('🚀 Testing Agentic Analyze-Only Mode with ts-node\n');
  
  try {
    // Create a temporary TypeScript test file
    const testContent = `
import { AgenticOrchestrator } from './src/services/AgenticOrchestrator';
import { SemanticRouterService } from './src/services/SemanticRouterService';

async function testAgenticAnalyzeMode() {
  console.log('🚀 Testing Agentic Analyze-Only Mode\\n');

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
      console.log(\`\\n📊 Testing: \${testCase.name}\`);
      console.log(\`Query: "\${testCase.query}"\`);
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

        console.log(\`✅ Success: \${response.success}\`);
        console.log(\`⏱️  Execution Time: \${executionTime}ms\`);
        
        if (response.semanticAnalysis) {
          console.log('\\n🧠 Semantic Analysis:');
          console.log(\`  Intent: \${response.semanticAnalysis.primary?.type || 'unknown'}\`);
          console.log(\`  Confidence: \${Math.round((response.semanticAnalysis.primary?.confidence || 0) * 100)}%\`);
        }

        if (response.routingPlan) {
          console.log('\\n🎯 Agent Routing:');
          console.log(\`  Primary Agent: \${response.routingPlan.primaryAgent?.name || 'unknown'}\`);
        }

        console.log('\\n📋 Results:');
        console.log(\`  Summary: \${response.synthesizedResponse?.summary || 'No summary available'}\`);

      } catch (error) {
        console.log(\`❌ Error: \${error.message}\`);
        console.log(\`Stack: \${error.stack}\`);
      }

      console.log('\\n' + '='.repeat(80));
    }

    console.log('\\n🎉 Agentic Analyze-Only Mode Testing Complete!');
  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
    console.error('This might be due to missing dependencies or configuration issues.');
  }
}

// Test semantic analysis only
async function testSemanticAnalysisOnly() {
  console.log('\\n🔍 Testing Semantic Analysis Only\\n');

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
      console.log(\`Query: "\${query}"\`);
      
      try {
        const semanticAnalysis = await router.analyzeSemanticIntent(query);
        const routingPlan = await router.routeToAgents(semanticAnalysis);

        console.log(\`  Intent: \${semanticAnalysis.primary?.type || 'unknown'} (\${Math.round((semanticAnalysis.primary?.confidence || 0) * 100)}%)\`);
        console.log(\`  Primary Agent: \${routingPlan.primaryAgent?.name || 'unknown'}\`);
        console.log(\`  Entities: Tokens(\${semanticAnalysis.entities?.tokens?.length || 0}), Protocols(\${semanticAnalysis.entities?.protocols?.length || 0}), Chains(\${semanticAnalysis.entities?.chains?.length || 0})\`);
        console.log('');
      } catch (error) {
        console.log(\`  Error: \${error.message}\`);
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
`;

    // Write the TypeScript test file
    require('fs').writeFileSync(path.join(__dirname, 'temp-test.ts'), testContent);
    
    // Run with ts-node
    console.log('Running test with ts-node...\n');
    execSync('npx ts-node -r tsconfig-paths/register temp-test.ts', {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    // Clean up
    require('fs').unlinkSync(path.join(__dirname, 'temp-test.ts'));
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    console.error('\nThis could be due to:');
    console.error('1. Missing dependencies (run npm install)');
    console.error('2. TypeScript compilation errors');
    console.error('3. Missing environment variables');
    console.error('4. Service initialization issues');
    
    // Try a simpler test
    console.log('\n🔄 Attempting simplified test...\n');
    await testBasicImports();
  }
}

async function testBasicImports() {
  console.log('🧪 Testing Basic Module Imports\n');
  
  const modules = [
    './src/services/AgenticOrchestrator',
    './src/services/SemanticRouterService',
    './src/services/MistralService',
    './src/agents/AgenticYieldAgent'
  ];
  
  for (const modulePath of modules) {
    try {
      console.log(`Testing import: ${modulePath}`);
      
      // Try to require the compiled version first
      const distPath = modulePath.replace('./src/', './dist/').replace('.ts', '.js');
      let module;
      
      try {
        module = require(distPath);
        console.log(`✅ Successfully imported from dist: ${distPath}`);
      } catch (distError) {
        console.log(`⚠️  Dist import failed, trying ts-node: ${modulePath}`);
        // This would need ts-node setup
        console.log(`❌ Could not import ${modulePath}: ${distError.message}`);
      }
      
    } catch (error) {
      console.log(`❌ Failed to import ${modulePath}: ${error.message}`);
    }
  }
}

// Run the test
runTestWithTsNode();
