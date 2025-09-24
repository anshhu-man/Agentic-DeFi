# Enhanced Chat API with Agent Integration

This document describes the unified chat endpoint that connects natural language conversations to all available DeFi agents through the Agentic Orchestrator.

## Overview

The Enhanced Chat API provides a conversational interface to your sophisticated multi-agent DeFi system. Users can ask natural language questions and receive intelligent responses powered by multiple specialized agents working together.

## Architecture

```
User Query → Enhanced Chat Controller → Agentic Orchestrator → Semantic Router → Multiple Agents → Response Synthesizer → Conversational Response
```

### Key Components

1. **Enhanced Chat Controller** - Main interface handling chat requests
2. **Agentic Orchestrator** - Coordinates multiple agents based on query analysis
3. **Semantic Router** - Analyzes intent and routes to appropriate agents
4. **Conversational Response Generator** - Converts technical agent responses to natural language
5. **Conversation Context Manager** - Maintains chat history and context

## API Endpoints

### 1. Chat with Agents

**Endpoint:** `POST /api/chat/agents`

Send a natural language message and receive an AI-powered response using multiple DeFi agents.

#### Request Body

```json
{
  "message": "What are the best yield opportunities for USDC on Polygon?",
  "userId": "user123",
  "conversationId": "conv456",
  "mode": "analyze_only",
  "userAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "userProfile": {
    "riskTolerance": "medium",
    "portfolioSize": "large",
    "experienceLevel": "intermediate",
    "preferredProtocols": ["Aave", "Compound", "Uniswap"]
  },
  "supabaseAccessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | ✅ | Natural language query or message |
| `userId` | string | ❌ | User identifier for conversation tracking |
| `conversationId` | string | ❌ | Conversation identifier for context |
| `mode` | string | ❌ | Execution mode: `analyze_only`, `execute_with_approval`, `autonomous` |
| `userAddress` | string | ❌ | Ethereum wallet address for personalized analysis |
| `userProfile` | object | ❌ | User preferences and risk profile |
| `supabaseAccessToken` | string | ❌ | Token for chat persistence |

#### Response

```json
{
  "success": true,
  "data": {
    "reply": "Based on my analysis of current market conditions, I found 3 high-yield opportunities for USDC on Polygon...",
    "agentInsights": {
      "primaryAgent": "AgenticYieldAgent",
      "confidence": 0.85,
      "intent": "YIELD_OPTIMIZATION",
      "opportunities": [...],
      "riskAssessment": "Medium risk with high reward potential",
      "recommendations": [
        "Consider Aave V3 lending with 8.5% APY",
        "Explore Compound III for stable yields"
      ],
      "nextSteps": [
        "Review risk parameters",
        "Start with small allocation"
      ]
    },
    "conversationContext": {
      "intent": "YIELD_OPTIMIZATION",
      "entities": {
        "tokens": ["USDC"],
        "protocols": ["Aave", "Compound"],
        "chains": ["Polygon"]
      },
      "followUpSuggestions": [
        "What are the risks of these yield opportunities?",
        "How do these yields compare across different chains?"
      ]
    }
  },
  "meta": {
    "executionTime": 1250,
    "agentsUsed": ["AgenticYieldAgent", "RiskAgent"],
    "coordinationStrategy": "sequential",
    "conversationId": "conv456",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Get Conversation History

**Endpoint:** `GET /api/chat/agents/conversations/:conversationId`

Retrieve the full conversation history with agent context.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversationId` | string | ✅ | Conversation identifier (URL parameter) |
| `userId` | string | ✅ | User identifier (query parameter) |

#### Response

```json
{
  "success": true,
  "data": {
    "conversationId": "conv456",
    "userId": "user123",
    "messages": [
      {
        "role": "user",
        "content": "What are the best yield opportunities?",
        "timestamp": "2024-01-15T10:30:00.000Z"
      },
      {
        "role": "assistant",
        "content": "Based on my analysis...",
        "timestamp": "2024-01-15T10:30:05.000Z",
        "agentMetadata": {
          "agentsUsed": ["AgenticYieldAgent", "RiskAgent"],
          "primaryIntent": "YIELD_OPTIMIZATION",
          "confidence": 0.85,
          "executionTime": 1250
        }
      }
    ]
  }
}
```

### 3. Get Agent Capabilities

**Endpoint:** `GET /api/chat/agents/capabilities`

Retrieve information about available agents and their capabilities.

#### Response

```json
{
  "success": true,
  "data": {
    "availableAgents": [
      {
        "name": "AgenticYieldAgent",
        "description": "Advanced AI-powered yield optimization with autonomous decision making",
        "capabilities": ["yield_optimization", "portfolio_analysis", "cross_chain_analysis"],
        "complexity": "high",
        "realTimeData": true
      }
    ],
    "supportedIntents": [
      "YIELD_OPTIMIZATION",
      "RISK_ASSESSMENT",
      "GOVERNANCE_PARTICIPATION"
    ],
    "executionModes": [
      {
        "mode": "analyze_only",
        "description": "Analyze and provide recommendations without executing transactions"
      }
    ]
  }
}
```

## Supported Query Types

### 1. Yield Optimization
- "What are the best yield opportunities for USDC?"
- "Find high-yield farming strategies on Polygon"
- "Compare lending rates across protocols"

### 2. Risk Assessment
- "Analyze the risks of my DeFi portfolio"
- "What are the liquidation risks for my positions?"
- "How can I reduce portfolio risk?"

### 3. Governance Participation
- "What governance proposals should I vote on?"
- "Show me active DAO proposals"
- "How much voting power do I have?"

### 4. Portfolio Analysis
- "Analyze my wallet performance"
- "Show me my yield farming returns"
- "What's my portfolio allocation?"

### 5. Market Intelligence
- "What's the current ETH price trend?"
- "Show me DeFi market conditions"
- "What are the latest protocol updates?"

### 6. Cross-chain Analysis
- "Compare yields between Ethereum and Polygon"
- "Find arbitrage opportunities across chains"
- "What are the bridge costs?"

## Execution Modes

### 1. Analyze Only (Default)
- Provides analysis and recommendations
- No blockchain transactions executed
- Safe for exploration and learning

### 2. Execute with Approval
- Plans specific actions
- Waits for user approval before execution
- Shows transaction details and costs

### 3. Autonomous
- Fully autonomous execution
- AI-powered risk management
- Requires high trust and proper configuration

## User Profile Configuration

Enhance responses by providing user preferences:

```json
{
  "userProfile": {
    "riskTolerance": "low" | "medium" | "high",
    "portfolioSize": "small" | "medium" | "large",
    "experienceLevel": "beginner" | "intermediate" | "expert",
    "preferredProtocols": ["Aave", "Compound", "Uniswap"],
    "preferredChains": ["Ethereum", "Polygon", "Arbitrum"],
    "investmentHorizon": "short" | "medium" | "long"
  }
}
```

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "MISSING_MESSAGE",
    "message": "message is required and must be a string"
  }
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "CONVERSATION_NOT_FOUND",
    "message": "Conversation not found"
  }
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "AGENT_CHAT_FAILED",
    "message": "Failed to process chat message with agents"
  }
}
```

## Testing

### Run the Test Suite

```bash
# Start the server
npm run dev

# In another terminal, run the tests
node test-chat-agents.js
```

### Manual Testing with cURL

```bash
# Test basic chat
curl -X POST http://localhost:3000/api/chat/agents \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the best yield opportunities for USDC?",
    "userId": "test_user",
    "mode": "analyze_only"
  }'

# Test agent capabilities
curl -X GET http://localhost:3000/api/chat/agents/capabilities
```

## Integration Examples

### Frontend Integration (React)

```javascript
import axios from 'axios';

const ChatService = {
  async sendMessage(message, options = {}) {
    const response = await axios.post('/api/chat/agents', {
      message,
      userId: options.userId,
      conversationId: options.conversationId,
      mode: options.mode || 'analyze_only',
      userProfile: options.userProfile
    });
    
    return response.data;
  },

  async getConversation(conversationId, userId) {
    const response = await axios.get(
      `/api/chat/agents/conversations/${conversationId}?userId=${userId}`
    );
    
    return response.data;
  }
};

// Usage
const result = await ChatService.sendMessage(
  "What are the best yield opportunities?",
  {
    userId: "user123",
    conversationId: "conv456",
    userProfile: {
      riskTolerance: "medium",
      experienceLevel: "intermediate"
    }
  }
);

console.log(result.data.reply);
console.log(result.data.agentInsights);
```

### WebSocket Integration

```javascript
// Listen for real-time agent updates
socket.on('agent_progress', (data) => {
  console.log(`Agent ${data.agentName} is processing...`);
});

socket.on('agent_complete', (data) => {
  console.log(`Agent ${data.agentName} completed with confidence ${data.confidence}`);
});
```

## Performance Considerations

### Response Times
- Simple queries: 500-1500ms
- Complex multi-agent queries: 2000-5000ms
- Autonomous execution: 5000-15000ms

### Rate Limiting
- Default: 100 requests per 15 minutes per IP
- Authenticated users: 500 requests per 15 minutes
- Premium users: 2000 requests per 15 minutes

### Caching
- Agent responses cached for 5 minutes
- Market data cached for 1 minute
- User profiles cached for 1 hour

## Security

### Authentication
- Optional Supabase JWT tokens
- Row Level Security (RLS) for chat persistence
- User-specific conversation isolation

### Input Validation
- Message length limits (10,000 characters)
- SQL injection prevention
- XSS protection

### Rate Limiting
- IP-based rate limiting
- User-based rate limiting
- Exponential backoff for failures

## Monitoring and Logging

### Metrics Tracked
- Request/response times
- Agent execution times
- Success/failure rates
- User engagement patterns

### Logging
- All requests logged with sanitized data
- Agent execution details
- Error tracking with stack traces
- Performance metrics

## Future Enhancements

### Planned Features
1. **Streaming Responses** - Real-time response generation
2. **Voice Integration** - Speech-to-text and text-to-speech
3. **Image Analysis** - Chart and screenshot analysis
4. **Multi-language Support** - Internationalization
5. **Advanced Analytics** - Conversation insights and patterns

### Agent Improvements
1. **New Agents** - NFT, Gaming, Social DeFi agents
2. **Enhanced Coordination** - Better multi-agent workflows
3. **Learning Capabilities** - Adaptive responses based on user feedback
4. **Integration Expansion** - More protocols and chains

## Support

For questions, issues, or feature requests:

1. Check the test suite: `node test-chat-agents.js`
2. Review logs in the console
3. Check health endpoint: `GET /health`
4. Verify agent capabilities: `GET /api/chat/agents/capabilities`

## Changelog

### v1.0.0 (Current)
- Initial release with unified chat endpoint
- Multi-agent coordination
- Conversation context management
- Supabase integration for persistence
- Comprehensive test suite
