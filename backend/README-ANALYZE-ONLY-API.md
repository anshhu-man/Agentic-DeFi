# Analyze-Only API Documentation

## Overview

The Analyze-Only API provides a dedicated endpoint for DeFi analysis without executing any blockchain transactions. This mode is perfect for getting insights, recommendations, and market intelligence while maintaining complete safety from unintended executions.

## Key Features

- 🔍 **Pure Analysis**: No blockchain transactions or state changes
- 🤖 **Multi-Agent Coordination**: Leverages all available DeFi agents
- 📊 **Real-Time Data**: Integrated with Pyth Network for live price feeds
- 💬 **Conversational AI**: Natural language queries with intelligent responses
- 🛡️ **Safety First**: Mode is enforced server-side, cannot be overridden
- 📈 **Rich Insights**: Comprehensive analysis with risk assessments and recommendations

## API Endpoints

### 1. Analyze Query
**POST** `/api/chat/analyze`

Main endpoint for analyze-only queries. The mode is automatically set to `analyze_only` server-side.

#### Request Body
```json
{
  "message": "What are the best USDC yield opportunities with low risk?",
  "userId": "user123",
  "conversationId": "conv_456",
  "userAddress": "0x...",
  "userProfile": {
    "riskTolerance": "low",
    "experienceLevel": "intermediate",
    "portfolioSize": "medium",
    "preferredChains": ["ethereum", "polygon"],
    "preferredProtocols": ["aave", "compound"]
  }
}
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "reply": "Based on current market conditions, here are the safest USDC yield opportunities...",
    "agentInsights": {
      "primaryAgent": "AgenticYieldAgent",
      "confidence": 0.85,
      "intent": "YIELD_OPTIMIZATION",
      "opportunities": [
        {
          "protocol": "Aave V3",
          "chain": "Ethereum",
          "apy": "4.2%",
          "risk": "Low",
          "tvl": "$2.1B"
        }
      ],
      "riskAssessment": {
        "overallRisk": "Low",
        "factors": ["Smart contract risk", "Liquidity risk"],
        "mitigation": "Use established protocols with high TVL"
      },
      "recommendations": [
        "Start with Aave V3 on Ethereum for maximum safety",
        "Consider diversifying across 2-3 protocols",
        "Monitor APY changes weekly"
      ],
      "nextSteps": [
        "Check current wallet balance",
        "Review gas costs for transactions",
        "Set up yield monitoring alerts"
      ]
    },
    "conversationContext": {
      "intent": "YIELD_OPTIMIZATION",
      "entities": {
        "tokens": ["USDC"],
        "protocols": ["Aave", "Compound"],
        "chains": ["Ethereum", "Polygon"]
      },
      "followUpSuggestions": [
        "What are the risks of these yield opportunities?",
        "How do these yields compare across different chains?",
        "What's the minimum investment for these strategies?"
      ]
    }
  },
  "meta": {
    "executionTime": 2340,
    "agentsUsed": ["AgenticYieldAgent", "RiskAgent"],
    "coordinationStrategy": "parallel_with_synthesis",
    "conversationId": "conv_456",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

### 2. Debug Information
**GET** `/api/chat/analyze/debug`

Returns system status and capabilities for debugging and integration testing.

#### Response Format
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "mode": "analyze_only",
    "capabilities": {
      "pythIntegration": true,
      "realTimeData": true,
      "multiAgentCoordination": true,
      "conversationalAI": true
    },
    "availableAgents": [
      "AgenticYieldAgent",
      "YieldAgent",
      "RiskAgent",
      "GovernanceAgent",
      "EnhancedYieldAgent"
    ],
    "supportedIntents": [
      "YIELD_OPTIMIZATION",
      "RISK_ASSESSMENT",
      "GOVERNANCE_PARTICIPATION",
      "PORTFOLIO_ANALYSIS",
      "MARKET_INTELLIGENCE",
      "CROSS_CHAIN_ANALYSIS"
    ],
    "systemInfo": {
      "nodeEnv": "development",
      "mistralModel": "mistral-medium",
      "pythEndpoint": "https://hermes.pyth.network",
      "version": "1.0.0"
    }
  }
}
```

## Supported Query Types

### 1. Yield Optimization
```json
{
  "message": "Find me the best yield farming opportunities for ETH"
}
```

### 2. Risk Assessment
```json
{
  "message": "Analyze the risks of my current DeFi portfolio"
}
```

### 3. Market Intelligence
```json
{
  "message": "What are the current DeFi market trends?"
}
```

### 4. Cross-Chain Analysis
```json
{
  "message": "Compare yield opportunities between Ethereum and Polygon"
}
```

### 5. Protocol Analysis
```json
{
  "message": "Should I use Aave or Compound for USDC lending?"
}
```

### 6. Governance Insights
```json
{
  "message": "What are the active governance proposals I should vote on?"
}
```

## User Profile Configuration

The `userProfile` object helps personalize recommendations:

```json
{
  "riskTolerance": "low" | "medium" | "high",
  "experienceLevel": "beginner" | "intermediate" | "expert",
  "portfolioSize": "small" | "medium" | "large",
  "preferredChains": ["ethereum", "polygon", "arbitrum", "optimism"],
  "preferredProtocols": ["aave", "compound", "uniswap", "curve"],
  "investmentGoals": ["yield", "growth", "safety", "liquidity"],
  "timeHorizon": "short" | "medium" | "long"
}
```

## Integration Examples

### JavaScript/TypeScript
```typescript
interface AnalyzeRequest {
  message: string;
  userId?: string;
  conversationId?: string;
  userAddress?: string;
  userProfile?: UserProfile;
}

async function analyzeQuery(request: AnalyzeRequest) {
  const response = await fetch('/api/chat/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  });
  
  return await response.json();
}

// Example usage
const result = await analyzeQuery({
  message: "What's the safest way to earn yield on my USDC?",
  userId: "user123",
  userProfile: {
    riskTolerance: "low",
    experienceLevel: "beginner"
  }
});
```

### Python
```python
import requests

def analyze_query(message, user_id=None, user_profile=None):
    url = "http://localhost:3001/api/chat/analyze"
    payload = {
        "message": message,
        "userId": user_id,
        "userProfile": user_profile
    }
    
    response = requests.post(url, json=payload)
    return response.json()

# Example usage
result = analyze_query(
    message="Find me low-risk yield opportunities",
    user_id="user123",
    user_profile={
        "riskTolerance": "low",
        "experienceLevel": "intermediate"
    }
)
```

### cURL
```bash
curl -X POST http://localhost:3001/api/chat/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the current DeFi risks I should be aware of?",
    "userId": "user123",
    "userProfile": {
      "riskTolerance": "medium",
      "experienceLevel": "expert"
    }
  }'
```

## Error Handling

### Common Error Responses

#### Missing Message
```json
{
  "success": false,
  "error": {
    "code": "MISSING_MESSAGE",
    "message": "message is required and must be a string"
  }
}
```

#### Analysis Failed
```json
{
  "success": false,
  "mode": "analyze_only",
  "error": {
    "code": "ANALYZE_ONLY_FAILED",
    "message": "Failed to process analyze-only request"
  }
}
```

#### Rate Limited
```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

## Performance Considerations

### Response Times
- **Simple queries**: 1-3 seconds
- **Complex analysis**: 3-8 seconds
- **Multi-agent coordination**: 5-15 seconds

### Rate Limits
- **Development**: 100 requests per 15 minutes
- **Production**: 1000 requests per 15 minutes

### Optimization Tips
1. **Cache conversations**: Use `conversationId` for context
2. **Batch related queries**: Ask comprehensive questions
3. **Use user profiles**: Better personalization = faster responses
4. **Monitor debug endpoint**: Check system health before heavy usage

## Real-Time Data Integration

### Pyth Network Integration
The API integrates with Pyth Network for real-time price feeds:

- **ETH/USD**: Live price updates every second
- **BTC/USD**: Live price updates every second  
- **USDC/USD**: Live price updates every second
- **200+ additional price feeds**: Available on demand

### Data Freshness
- **Price data**: < 1 second latency
- **Protocol data**: < 5 minutes latency
- **Governance data**: < 15 minutes latency

## Security & Safety

### Server-Side Mode Enforcement
- Mode is set to `analyze_only` at the controller level
- Client cannot override or bypass this setting
- No blockchain transactions are ever executed
- All operations are read-only

### Data Privacy
- Queries are logged for debugging (can be disabled)
- User profiles are not persisted by default
- Conversation history is kept in memory only
- No sensitive data is stored permanently

## Testing

### Health Check
```bash
curl http://localhost:3001/api/chat/analyze/debug
```

### Basic Query Test
```bash
curl -X POST http://localhost:3001/api/chat/analyze \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the current ETH price?"}'
```

### Comprehensive Test Suite
Run the existing test suite:
```bash
node test-analyze-only-comprehensive.js
```

## Troubleshooting

### Common Issues

#### 1. "Agent not responding"
- Check debug endpoint for agent health
- Verify Mistral API key is configured
- Ensure network connectivity to external APIs

#### 2. "Pyth data unavailable"
- Verify PYTH_ENDPOINT environment variable
- Check network connectivity to hermes.pyth.network
- Review debug endpoint for Pyth integration status

#### 3. "Slow response times"
- Monitor system resources (CPU, memory)
- Check external API response times
- Consider reducing query complexity

#### 4. "Inconsistent results"
- Verify user profile consistency
- Check conversation context
- Review agent coordination logs

### Debug Logging
Enable detailed logging:
```bash
export LOG_LEVEL=debug
export DEBUG_AGENTS=true
```

## Migration from Existing Endpoints

### From `/api/chat/agents`
**Old way:**
```json
{
  "message": "Find yield opportunities",
  "mode": "analyze_only"
}
```

**New way:**
```json
{
  "message": "Find yield opportunities"
}
```

The mode is automatically enforced, making integration cleaner and safer.

## Roadmap

### Upcoming Features
- **Streaming responses**: Real-time response streaming
- **WebSocket support**: Live updates and notifications
- **Enhanced caching**: Faster response times
- **Custom agents**: User-defined analysis agents
- **Export capabilities**: PDF/CSV report generation

### API Versioning
- Current version: `v1`
- Backward compatibility: Guaranteed for 12 months
- Deprecation notice: 6 months advance notice

## Support

### Documentation
- **API Reference**: This document
- **Agent Documentation**: `README-CHAT-AGENTS.md`
- **Testing Guide**: `README-TESTING.md`

### Community
- **GitHub Issues**: Report bugs and feature requests
- **Discord**: Real-time community support
- **Documentation**: Comprehensive guides and examples

---

**Last Updated**: January 2024  
**API Version**: 1.0.0  
**Compatibility**: Node.js 18+, TypeScript 4.5+
