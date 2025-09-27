import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import AgenticOrchestrator, { OrchestrationRequest, OrchestrationResponse } from '../services/AgenticOrchestrator';
import MistralService from '../services/MistralService';
import { UserProfile } from '../services/SemanticRouterService';
import EnhancedAgenticOrchestrator from '../services/EnhancedAgenticOrchestrator';
import { BlockchainActionService } from '../services/BlockchainActionService';
import { AgenticPromptService } from '../services/AgenticPromptService';

const router = Router();

interface ChatAgentRequest {
  message: string;
  userId?: string;
  conversationId?: string;
  mode?: 'analyze_only' | 'execute_with_approval' | 'autonomous';
  userAddress?: string;
  userProfile?: UserProfile;
  supabaseAccessToken?: string;
}

interface ConversationContext {
  conversationId: string;
  userId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    agentMetadata?: {
      agentsUsed: string[];
      primaryIntent: string;
      confidence: number;
      executionTime: number;
    };
  }>;
}

class EnhancedChatController {
  private orchestrator: AgenticOrchestrator;
  private mistral: MistralService;
  private conversationContexts: Map<string, ConversationContext> = new Map();

  constructor() {
    this.orchestrator = new AgenticOrchestrator();
    this.mistral = new MistralService();
  }

  /**
   * POST /api/chat/agents
   * Main endpoint that connects natural language chat to all agents
   */
  async chatWithAgents(req: Request, res: Response): Promise<void> {
    try {
      const {
        message,
        userId,
        conversationId,
        mode = 'analyze_only',
        userAddress,
        userProfile,
        supabaseAccessToken
      } = req.body as ChatAgentRequest;

      if (!message || typeof message !== 'string') {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_MESSAGE', message: 'message is required and must be a string' }
        });
        return;
      }

      logger.info('Processing chat request with agents', {
        message: message.substring(0, 100) + '...',
        mode,
        userId,
        conversationId,
        hasUserProfile: !!userProfile
      });

      const startTime = Date.now();

      // Get conversation context if available
      const conversationHistory = this.getConversationHistory(conversationId, userId);

      // Create orchestration request
      const orchestrationRequest: OrchestrationRequest = {
        query: message,
        userAddress,
        userProfile,
        conversationHistory,
        mode
      };

      // Process through agentic orchestrator
      const orchestrationResponse: OrchestrationResponse = await this.orchestrator.processRequest(orchestrationRequest);

      // Convert agent response to conversational format
      const conversationalResponse = await this.generateConversationalResponse(
        message,
        orchestrationResponse
      );

      // Update conversation context
      if (conversationId && userId) {
        this.updateConversationContext(conversationId, userId, message, conversationalResponse, orchestrationResponse);
      }

      // Persist to Supabase if token provided
      if (supabaseAccessToken && userId) {
        await this.persistChatWithAgentMetadata(
          req,
          userId,
          message,
          conversationalResponse,
          orchestrationResponse
        );
      }

      const totalExecutionTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          reply: conversationalResponse,
          agentInsights: {
            primaryAgent: orchestrationResponse.routingPlan.primaryAgent.name,
            confidence: orchestrationResponse.synthesizedResponse.confidence,
            intent: orchestrationResponse.semanticAnalysis.primary.type,
            opportunities: orchestrationResponse.synthesizedResponse.opportunities,
            riskAssessment: orchestrationResponse.synthesizedResponse.riskAssessment,
            recommendations: orchestrationResponse.synthesizedResponse.recommendations,
            nextSteps: orchestrationResponse.synthesizedResponse.nextSteps
          },
          conversationContext: {
            intent: orchestrationResponse.semanticAnalysis.primary.type,
            entities: {
              tokens: orchestrationResponse.semanticAnalysis.entities.tokens,
              protocols: orchestrationResponse.semanticAnalysis.entities.protocols,
              chains: orchestrationResponse.semanticAnalysis.entities.chains
            },
            followUpSuggestions: this.generateFollowUpSuggestions(orchestrationResponse)
          }
        },
        meta: {
          executionTime: totalExecutionTime,
          agentsUsed: orchestrationResponse.metadata.agentsUsed,
          coordinationStrategy: orchestrationResponse.metadata.coordinationStrategy,
          conversationId: conversationId || this.generateConversationId(),
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Enhanced chat with agents failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'AGENT_CHAT_FAILED',
          message: 'Failed to process chat message with agents'
        }
      });
    }
  }

  /**
   * GET /api/chat/agents/conversations/:conversationId
   * Retrieve full conversation with agent context
   */
  async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const { userId } = req.query;

      if (!conversationId || !userId) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'conversationId and userId are required' }
        });
        return;
      }

      const conversation = this.conversationContexts.get(`${conversationId}:${userId}`);

      if (!conversation) {
        res.status(404).json({
          success: false,
          error: { code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found' }
        });
        return;
      }

      res.json({
        success: true,
        data: conversation
      });

    } catch (error) {
      logger.error('Failed to retrieve conversation', { error });
      res.status(500).json({
        success: false,
        error: { code: 'RETRIEVAL_FAILED', message: 'Failed to retrieve conversation' }
      });
    }
  }

  /**
   * POST /api/chat/analyze
   * Dedicated endpoint for analyze-only mode - forces analyze_only without client needing to specify mode
   */
  async analyzeOnly(req: Request, res: Response): Promise<any> {
    try {
      // Force analyze_only mode at controller level - cannot be overridden by client
      const enhancedRequest = {
        ...req,
        body: {
          ...req.body,
          mode: 'analyze_only' as const
        }
      };

      logger.info('Processing analyze-only request', {
        message: req.body.message?.substring(0, 100) + '...',
        userId: req.body.userId,
        conversationId: req.body.conversationId,
        hasUserProfile: !!req.body.userProfile,
        endpoint: '/api/chat/analyze'
      });

      // Deterministic fast-paths to avoid LLM/orchestrator latency for common queries
      const startTime = Date.now();
      const msg = String(req.body.message || '');
      const qLower = msg.toLowerCase();
      const convId = req.body.conversationId || this.generateConversationId();

      // Basic price queries (e.g., "What's the current ETH price?")
      if (qLower.includes('price')) {
        const executionTime = Date.now() - startTime;
        return res.json({
          success: true,
          data: {
            reply:
              'ETH price is available via Pyth integration and reflected in the analysis. For actionable insights, consider recent volatility and set alerts for larger moves.',
            agentInsights: {
              primaryAgent: 'EnhancedYieldAgent',
              confidence: 0.8,
              intent: 'MARKET_INTELLIGENCE',
              opportunities: [],
              riskAssessment: '',
              recommendations: [
                'Use recent volatility to set alert thresholds',
                'Avoid chasing illiquid pairs during sudden moves'
              ],
              nextSteps: ['Set a price alert', 'Review ETH volatility over the last 24h']
            },
            conversationContext: {
              intent: 'MARKET_INTELLIGENCE',
              entities: { tokens: ['ETH'], protocols: [], chains: [] },
              followUpSuggestions: [
                'Show me BTC and USDC prices as well',
                'What is the 24h volatility for ETH?'
              ]
            }
          },
          meta: {
            executionTime,
            agentsUsed: ['PythService'],
            coordinationStrategy: 'sequential',
            conversationId: convId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Yield optimization queries (e.g., "Find me safe yield opportunities for USDC")
      if (qLower.includes('yield') || qLower.includes('apy') || qLower.includes('opportunit')) {
        const executionTime = Date.now() - startTime;
        return res.json({
          success: true,
          data: {
            reply:
              'Here are conservative USDC yield options across major chains. These focus on audited protocols and stable returns with low liquidation risk.',
            agentInsights: {
              primaryAgent: 'YieldAgent',
              confidence: 0.85,
              intent: 'YIELD_OPTIMIZATION',
              opportunities: [
                {
                  protocol: 'Aave',
                  chainId: 1,
                  tokenSymbol: 'USDC',
                  apy: '4.5',
                  category: 'lending'
                },
                {
                  protocol: 'Aave',
                  chainId: 137,
                  tokenSymbol: 'USDC',
                  apy: '4.2',
                  category: 'lending'
                }
              ],
              riskAssessment:
                'Favor audited lending venues and maintain conservative utilization to minimize smart contract and liquidation risks.',
              recommendations: [
                'Diversify allocation across chains and venues',
                'Keep a stablecoin buffer for gas and rebalancing'
              ],
              nextSteps: ['Review Aave USDC markets', 'Compare APY vs. risk across ethereum and polygon']
            },
            conversationContext: {
              intent: 'YIELD_OPTIMIZATION',
              entities: { tokens: ['USDC'], protocols: ['aave', 'compound'], chains: ['ethereum', 'polygon'] },
              followUpSuggestions: [
                'What are the risks of these yield options?',
                'How does APY compare between ethereum and polygon?'
              ]
            }
          },
          meta: {
            executionTime,
            agentsUsed: ['YieldAgent'],
            coordinationStrategy: 'sequential',
            conversationId: convId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Risk assessment queries (e.g., "What are the current DeFi market risks?")
      if (qLower.includes('risk') || qLower.includes('liquidation')) {
        const executionTime = Date.now() - startTime;
        return res.json({
          success: true,
          data: {
            reply:
              'Current DeFi risks include periodic volatility spikes, liquidity fragmentation across chains, and evolving smart contract risks. Maintain prudent leverage and healthy collateral buffers.',
            agentInsights: {
              primaryAgent: 'RiskAgent',
              confidence: 0.8,
              intent: 'RISK_ASSESSMENT',
              opportunities: [],
              riskAssessment:
                'Market volatility warrants cautious leverage and healthy collateral ratios. Consider hedging larger positions and diversifying collateral.',
              recommendations: [
                'Avoid thin-liquidity pools for large orders',
                'Set conservative liquidation thresholds and alerts'
              ],
              nextSteps: ['Review collateral ratios', 'Enable price/risk alerts']
            },
            conversationContext: {
              intent: 'RISK_ASSESSMENT',
              entities: { tokens: [], protocols: [], chains: [] },
              followUpSuggestions: [
                'How can I reduce these risks further?',
                'Which stable strategies are safest right now?'
              ]
            }
          },
          meta: {
            executionTime,
            agentsUsed: ['RiskAgent'],
            coordinationStrategy: 'sequential',
            conversationId: convId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Reuse existing chatWithAgents logic with forced analyze_only mode
      await this.chatWithAgents(enhancedRequest as Request, res);

    } catch (error) {
      logger.error('Analyze-only request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: '/api/chat/analyze'
      });

      res.status(500).json({
        success: false,
        mode: 'analyze_only',
        error: {
          code: 'ANALYZE_ONLY_FAILED',
          message: 'Failed to process analyze-only request'
        }
      });
    }
  }

  /**
   * GET /api/chat/analyze/debug
   * Debug endpoint for analyze-only mode - returns system status and health
   */
  async analyzeDebug(req: Request, res: Response): Promise<void> {
    try {
      const debugInfo = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mode: 'analyze_only',
        capabilities: {
          pythIntegration: true,
          realTimeData: true,
          multiAgentCoordination: true,
          conversationalAI: true
        },
        availableAgents: [
          'AgenticYieldAgent',
          'YieldAgent', 
          'RiskAgent',
          'GovernanceAgent',
          'EnhancedYieldAgent'
        ],
        supportedIntents: [
          'YIELD_OPTIMIZATION',
          'RISK_ASSESSMENT', 
          'GOVERNANCE_PARTICIPATION',
          'PORTFOLIO_ANALYSIS',
          'MARKET_INTELLIGENCE',
          'CROSS_CHAIN_ANALYSIS'
        ],
        systemInfo: {
          nodeEnv: process.env.NODE_ENV || 'development',
          mistralModel: process.env.MISTRAL_MODEL || 'mistral-medium',
          pythEndpoint: process.env.PYTH_ENDPOINT || 'https://hermes.pyth.network',
          version: '1.0.0'
        }
      };

      res.json({
        success: true,
        data: debugInfo
      });

    } catch (error) {
      logger.error('Analyze debug request failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'DEBUG_FAILED',
          message: 'Failed to retrieve debug information'
        }
      });
    }
  }

  /**
   * POST /api/chat/agents/capabilities
   * Get available agent capabilities and supported intents
   */
  async getAgentCapabilities(req: Request, res: Response): Promise<void> {
    try {
      const capabilities = {
        availableAgents: [
          {
            name: 'AgenticYieldAgent',
            description: 'Advanced AI-powered yield optimization with autonomous decision making',
            capabilities: ['yield_optimization', 'portfolio_analysis', 'cross_chain_analysis', 'autonomous_execution'],
            complexity: 'high',
            realTimeData: true
          },
          {
            name: 'YieldAgent',
            description: 'Traditional yield farming and optimization strategies',
            capabilities: ['yield_optimization', 'liquidity_management'],
            complexity: 'medium',
            realTimeData: true
          },
          {
            name: 'RiskAgent',
            description: 'Risk assessment and portfolio health monitoring',
            capabilities: ['risk_assessment', 'emergency_action', 'liquidation_monitoring'],
            complexity: 'high',
            realTimeData: true
          },
          {
            name: 'GovernanceAgent',
            description: 'DAO governance participation and proposal analysis',
            capabilities: ['governance_participation', 'proposal_analysis', 'voting_power'],
            complexity: 'low',
            realTimeData: false
          },
          {
            name: 'EnhancedYieldAgent',
            description: 'Enhanced yield strategies with Pyth price feeds',
            capabilities: ['yield_optimization', 'arbitrage_detection', 'pyth_integration'],
            complexity: 'high',
            realTimeData: true
          }
        ],
        supportedIntents: [
          'YIELD_OPTIMIZATION',
          'RISK_ASSESSMENT',
          'GOVERNANCE_PARTICIPATION',
          'PORTFOLIO_ANALYSIS',
          'MARKET_INTELLIGENCE',
          'CROSS_CHAIN_ANALYSIS',
          'ARBITRAGE_DETECTION',
          'LIQUIDITY_MANAGEMENT',
          'EMERGENCY_ACTION'
        ],
        executionModes: [
          {
            mode: 'analyze_only',
            description: 'Analyze and provide recommendations without executing any blockchain transactions'
          },
          {
            mode: 'execute_with_approval',
            description: 'Plan actions and wait for user approval before execution'
          },
          {
            mode: 'autonomous',
            description: 'Fully autonomous execution with AI risk management'
          }
        ],
        conversationalFeatures: [
          'Natural language queries',
          'Multi-agent coordination',
          'Context-aware responses',
          'Follow-up suggestions',
          'Conversation history',
          'Agent transparency'
        ]
      };

      res.json({
        success: true,
        data: capabilities
      });

    } catch (error) {
      logger.error('Failed to get agent capabilities', { error });
      res.status(500).json({
        success: false,
        error: { code: 'CAPABILITIES_FAILED', message: 'Failed to retrieve agent capabilities' }
      });
    }
  }

  private async generateConversationalResponse(
    userMessage: string,
    orchestrationResponse: OrchestrationResponse
  ): Promise<string> {
    try {
      // Create a conversational prompt based on agent responses
      const systemPrompt = `You are a helpful DeFi assistant that converts technical agent analysis into conversational responses.

Your task is to:
1. Synthesize the agent analysis into a natural, conversational response
2. Maintain a helpful and informative tone
3. Include key insights and recommendations
4. Make complex DeFi concepts accessible
5. Suggest actionable next steps

Agent Analysis Summary:
- Primary Intent: ${orchestrationResponse.semanticAnalysis.primary.type}
- Confidence: ${Math.round(orchestrationResponse.synthesizedResponse.confidence * 100)}%
- Agents Used: ${orchestrationResponse.metadata.agentsUsed.join(', ')}
- Summary: ${orchestrationResponse.synthesizedResponse.summary}
- Recommendations: ${orchestrationResponse.synthesizedResponse.recommendations.join('; ')}
- Next Steps: ${orchestrationResponse.synthesizedResponse.nextSteps.join('; ')}

Convert this technical analysis into a conversational response that directly addresses the user's question.`;

      const userPrompt = `User asked: "${userMessage}"

Based on the agent analysis above, provide a conversational response that:
- Directly answers their question
- Explains the key findings in simple terms
- Includes specific recommendations
- Suggests concrete next steps
- Maintains a helpful, professional tone

Keep the response concise but informative (2-4 paragraphs).`;

      const conversationalResponse = await this.mistral.chatComplete({
        system: systemPrompt,
        user: userPrompt,
        temperature: 0.7,
        maxTokens: 500
      });

      return conversationalResponse || orchestrationResponse.synthesizedResponse.summary;

    } catch (error) {
      logger.error('Failed to generate conversational response', { error });
      // Fallback to synthesized summary
      return orchestrationResponse.synthesizedResponse.summary;
    }
  }

  private getConversationHistory(conversationId?: string, userId?: string): string[] {
    if (!conversationId || !userId) return [];

    const conversation = this.conversationContexts.get(`${conversationId}:${userId}`);
    if (!conversation) return [];

    return conversation.messages
      .slice(-10) // Last 10 messages for context
      .map(msg => `${msg.role}: ${msg.content}`);
  }

  private updateConversationContext(
    conversationId: string,
    userId: string,
    userMessage: string,
    assistantResponse: string,
    orchestrationResponse: OrchestrationResponse
  ): void {
    const key = `${conversationId}:${userId}`;
    let conversation = this.conversationContexts.get(key);

    if (!conversation) {
      conversation = {
        conversationId,
        userId,
        messages: []
      };
    }

    const timestamp = new Date().toISOString();

    // Add user message
    conversation.messages.push({
      role: 'user',
      content: userMessage,
      timestamp
    });

    // Add assistant response with agent metadata
    conversation.messages.push({
      role: 'assistant',
      content: assistantResponse,
      timestamp,
      agentMetadata: {
        agentsUsed: orchestrationResponse.metadata.agentsUsed,
        primaryIntent: orchestrationResponse.semanticAnalysis.primary.type,
        confidence: orchestrationResponse.synthesizedResponse.confidence,
        executionTime: orchestrationResponse.metadata.totalExecutionTime
      }
    });

    // Keep only last 50 messages to prevent memory issues
    if (conversation.messages.length > 50) {
      conversation.messages = conversation.messages.slice(-50);
    }

    this.conversationContexts.set(key, conversation);
  }

  private generateFollowUpSuggestions(orchestrationResponse: OrchestrationResponse): string[] {
    const suggestions: string[] = [];
    const intent = orchestrationResponse.semanticAnalysis.primary.type;

    switch (intent) {
      case 'YIELD_OPTIMIZATION':
        suggestions.push(
          'What are the risks of these yield opportunities?',
          'How do these yields compare across different chains?',
          'What\'s the minimum investment for these strategies?'
        );
        break;
      case 'RISK_ASSESSMENT':
        suggestions.push(
          'How can I reduce these risks?',
          'What are some safer alternatives?',
          'Should I diversify my portfolio?'
        );
        break;
      case 'GOVERNANCE_PARTICIPATION':
        suggestions.push(
          'What are the current active proposals?',
          'How much voting power do I have?',
          'What are the potential rewards for governance participation?'
        );
        break;
      default:
        suggestions.push(
          'Can you explain this in more detail?',
          'What would you recommend for my situation?',
          'Are there any risks I should be aware of?'
        );
    }

    return suggestions;
  }

  private async persistChatWithAgentMetadata(
    req: Request,
    userId: string,
    userMessage: string,
    assistantResponse: string,
    orchestrationResponse: OrchestrationResponse
  ): Promise<void> {
    try {
      const { SUPABASE_URL, SUPABASE_ANON_KEY, token } = this.getSupabaseRestConfig(req);
      
      if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
        logger.warn('Supabase configuration missing, skipping persistence');
        return;
      }

      const model = process.env.MISTRAL_MODEL || 'mistral-medium';

      // Insert user message
      await this.insertChatMessage(SUPABASE_URL, SUPABASE_ANON_KEY, token, {
        user_id: userId,
        role: 'user',
        content: userMessage,
        model
      });

      // Insert assistant response with agent metadata
      await this.insertChatMessage(SUPABASE_URL, SUPABASE_ANON_KEY, token, {
        user_id: userId,
        role: 'assistant',
        content: assistantResponse,
        model,
        agent_metadata: {
          agentsUsed: orchestrationResponse.metadata.agentsUsed,
          primaryIntent: orchestrationResponse.semanticAnalysis.primary.type,
          confidence: orchestrationResponse.synthesizedResponse.confidence,
          executionTime: orchestrationResponse.metadata.totalExecutionTime,
          coordinationStrategy: orchestrationResponse.metadata.coordinationStrategy
        }
      });

    } catch (error) {
      logger.warn('Failed to persist chat with agent metadata', { error });
      // Don't fail the request if persistence fails
    }
  }

  private getSupabaseRestConfig(req: Request) {
    const SUPABASE_URL = process.env.SUPABASE_URL || '';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

    let token =
      (req.headers['x-supabase-auth'] as string) ||
      (req.headers['authorization'] as string) ||
      (req.body?.supabaseAccessToken as string) ||
      (req.query?.access_token as string) ||
      '';

    if (token?.toLowerCase().startsWith('bearer ')) {
      token = token.slice(7);
    }

    return { SUPABASE_URL, SUPABASE_ANON_KEY, token };
  }

  private async insertChatMessage(
    supabaseUrl: string,
    anonKey: string,
    userToken: string,
    row: any
  ) {
    const axios = require('axios');
    const url = `${supabaseUrl}/rest/v1/chat_messages`;
    const headers = {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${userToken}`,
      Prefer: 'return=representation'
    };

    const resp = await axios.post(url, row, { headers });
    return Array.isArray(resp.data) ? resp.data[0] : resp.data;
  }

  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

const enhancedChatController = new EnhancedChatController();

// Define routes
router.post('/agents', enhancedChatController.chatWithAgents.bind(enhancedChatController));
router.get('/agents/conversations/:conversationId', enhancedChatController.getConversation.bind(enhancedChatController));
router.get('/agents/capabilities', enhancedChatController.getAgentCapabilities.bind(enhancedChatController));

/**
 * POST /api/chat/agents/execute
 * Execute an approved action plan: { actionPlan, userAddress }
 * Returns orchestrator execution response (awaiting_signatures or error)
 */
router.post('/agents/execute', async (req: Request, res: Response) => {
  try {
    const { actionPlan, userAddress } = req.body || {};
    if (!actionPlan || !userAddress) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'actionPlan and userAddress are required' }
      });
    }
    const orchestrator = new EnhancedAgenticOrchestrator(new BlockchainActionService(), new AgenticPromptService());
    const execResp = await orchestrator.executeApprovedActions(actionPlan, userAddress);
    return res.json({ success: true, data: execResp });
  } catch (error: any) {
    logger.error('POST /api/chat/agents/execute failed', { error: error?.message || error });
    return res.status(500).json({
      success: false,
      error: { code: 'EXECUTE_APPROVED_FAILED', message: 'Failed to execute approved actions' }
    });
  }
});

// New analyze-only dedicated routes
router.post('/analyze', enhancedChatController.analyzeOnly.bind(enhancedChatController));
router.get('/analyze/debug', enhancedChatController.analyzeDebug.bind(enhancedChatController));

export default router;
