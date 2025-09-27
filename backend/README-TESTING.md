# Analyze-Only Mode Testing Guide

This guide explains how to use the comprehensive test script to validate your analyze_only mode functionality.

## 🚀 Quick Start

### Prerequisites
1. Ensure your `.env` file has `MISTRAL_API_KEY` set
2. Make sure all dependencies are installed: `npm install`
3. Ensure your backend code is compiled (if using TypeScript): `npm run build`

### Running the Comprehensive Test

```bash
# Navigate to backend directory
cd backend

# Run the comprehensive test script
node test-analyze-only-comprehensive.js
```

## 📊 What This Test Does

### 1. **Environment Validation**
- ✅ Checks for required environment variables
- ✅ Validates Mistral API key availability

### 2. **Pyth Network Integration Test**
- ✅ Fetches real-time price data from Pyth Network
- ✅ Validates data accuracy and format
- ✅ Tests ETH/USD, BTC/USD, and USDC/USD price feeds
- ✅ Includes fallback mock data if Pyth is unavailable

### 3. **Server Health Check**
- ✅ Starts your backend server on port 3001 (to avoid conflicts)
- ✅ Validates server health and API endpoints
- ✅ Ensures all services are ready for testing

### 4. **Comprehensive Analyze-Only Tests**

#### Test Cases:
1. **Price Query Test**: "What's the current ETH price and what does it mean for DeFi yields?"
2. **Yield Optimization Test**: "Find me the best USDC yield opportunities with low risk"
3. **Risk Analysis Test**: "Analyze the current DeFi market risks and potential liquidation dangers"
4. **Market Intelligence Test**: "What are the current DeFi market conditions and trends?"
5. **Cross-Chain Analysis Test**: "Compare yield farming opportunities between Ethereum and Polygon"

#### Each Test Validates:
- ✅ Response success and proper error handling
- ✅ Correct intent recognition by AI
- ✅ **No execution actions** (critical for analyze_only mode)
- ✅ Presence of analysis, recommendations, and insights
- ✅ Response quality and relevance
- ✅ Performance metrics (response times)

### 5. **Data Accuracy Validation**
- ✅ Compares AI responses against real Pyth price data
- ✅ Ensures market data is properly integrated
- ✅ Validates confidence intervals and timestamps

### 6. **Performance Benchmarking**
- ✅ Measures response times for each test
- ✅ Tracks overall system performance
- ✅ Identifies potential bottlenecks

## 📋 Understanding Test Results

### Success Indicators
- ✅ **All tests passed**: Your analyze_only mode is working perfectly
- ✅ **Pyth integration valid**: Real market data is being used correctly
- ✅ **Server healthy**: All backend services are operational
- ✅ **No execution actions**: Mode compliance verified

### Common Issues and Solutions

#### 1. **Server Startup Issues**
```
❌ Failed to start or connect to server
```
**Solutions:**
- Ensure no other process is using port 3001
- Check if your backend compiles without errors: `npm run build`
- Verify all dependencies are installed: `npm install`

#### 2. **Mistral API Issues**
```
❌ MISTRAL_API_KEY not found in environment variables
```
**Solutions:**
- Add your Mistral API key to `.env` file: `MISTRAL_API_KEY=your_key_here`
- Ensure the API key is valid and has sufficient credits

#### 3. **Pyth Network Issues**
```
⚠️ Pyth validation issues
```
**Solutions:**
- Check internet connectivity
- The test includes fallback mock data, so this won't stop testing
- Pyth Network might be temporarily unavailable

#### 4. **Intent Recognition Issues**
```
❌ Intent Recognition: undefined (expected: YIELD_OPTIMIZATION)
```
**Solutions:**
- Check your SemanticRouterService implementation
- Verify Mistral API responses are being parsed correctly
- Review your prompt engineering in AgenticPromptService

## 📊 Test Output Files

### `test-results-analyze-only.json`
Detailed JSON report containing:
- Complete test results and validations
- Performance metrics
- Pyth data snapshots
- Server health status
- Error details and debugging information

## 🔧 Customizing Tests

### Adding New Test Cases
Edit `test-analyze-only-comprehensive.js` and add new test methods to the `AnalyzeOnlyTests` class:

```javascript
static async runCustomTest() {
  const testName = 'Custom Test';
  TestLogger.subsection(testName);
  
  try {
    const query = "Your custom query here";
    const response = await this.makeAnalyzeOnlyRequest(query);
    
    const validations = [
      {
        name: 'Custom Validation',
        check: /* your validation logic */,
        actual: /* actual value */,
        expected: /* expected value */,
      },
    ];

    return this.recordTestResult(testName, validations, {
      query,
      // additional metadata
    });
  } catch (error) {
    return this.recordTestResult(testName, [], { error: error.message });
  }
}
```

### Modifying Configuration
Update the `CONFIG` object at the top of the test file:

```javascript
const CONFIG = {
  server: {
    port: 3001, // Change if needed
    host: 'localhost',
    startupTimeout: 30000,
  },
  pyth: {
    endpoint: 'https://hermes.pyth.network',
    // Add more price feeds as needed
  },
  test: {
    timeout: 60000,
    retries: 3,
  }
};
```

## 🛡️ Safety Features

- **Non-destructive**: Won't modify any existing code
- **Isolated**: Uses separate port (3001) to avoid conflicts
- **Graceful cleanup**: Automatically stops test server
- **Error handling**: Comprehensive error reporting
- **Fallback data**: Mock data if external services fail

## 🎯 Expected Results

For a properly working analyze_only mode, you should see:

```
🎯 TEST SUMMARY:
   Total Tests: 5
   ✅ Passed: 5
   ❌ Failed: 0
   ⏱️  Duration: 45.2s
   📈 Success Rate: 100.0%

🔗 PYTH INTEGRATION:
   Data Sources: 3
   Validation: ✅ Valid

🖥️  SERVER HEALTH:
   Status: ✅ Healthy

🎉 ALL TESTS PASSED! Your analyze_only mode is working perfectly!
```

## 🆘 Getting Help

If tests fail or you encounter issues:

1. **Check the detailed output** for specific error messages
2. **Review the generated JSON report** for debugging information
3. **Ensure all prerequisites** are met (API keys, dependencies, etc.)
4. **Run individual components** (like `test-mistral-final.js`) to isolate issues
5. **Check server logs** for additional error details

## 🔄 Continuous Testing

For ongoing validation, you can:

1. **Run tests before deployments** to ensure analyze_only mode works
2. **Schedule periodic tests** to monitor Pyth data integration
3. **Add tests to CI/CD pipeline** for automated validation
4. **Monitor response quality** over time with the generated reports

This comprehensive testing approach ensures your analyze_only mode is robust, accurate, and reliable for production use.
