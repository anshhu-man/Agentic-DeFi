import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import AgenticOrchestrator, { OrchestrationRequest, OrchestrationResponse } from '../services/AgenticOrchestrator';

export class AgenticController {
  private orchestrator: AgenticOrchestrator;

  constructor() {
    this.orchestrator = new AgenticOrchestrator();
  }

  async processQuery(req: Request, res: Response): Promise<void> {
    try {
      const { query, userAddress, userProfile, mode = 'analyze_only' } = req.body;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Query is required and must be a string',
        });
        return;
      }

      logger.info('Processing agentic query', {
        query,
        mode,
        userAddress,
        hasUserProfile: !!userProfile,
      });

      const orchestrationRequest: OrchestrationRequest = {
        query,
        userAddress,
        userProfile,
        mode: mode as 'analyze_only' | 'execute_with_approval' | 'autonomous',
      };

      const response: OrchestrationResponse = await this.orchestrator.processRequest(orchestrationRequest);

      logger.info('Agentic query processed', {
        success: response.success,
        primaryIntent: response.semanticAnalysis.primary.type,
        confidence: response.synthesizedResponse.confidence,
        agentsUsed: response.metadata.agentsUsed.length,
        executionTime: response.metadata.totalExecutionTime,
      });

      res.json({
        success: response.success,
        data: {
          // Semantic Analysis
          intent: {
            type: response.semanticAnalysis.primary.type,
            confidence: response.semanticAnalysis.primary.confidence,
            reasoning: response.semanticAnalysis.primary.reasoning,
            complexity: response.semanticAnalysis.secondary.complexity,
            urgency: response.semanticAnalysis.secondary.urgency,
            riskTolerance: response.semanticAnalysis.secondary.riskTolerance,
          },
          
          // Agent Routing
          routing: {
            primaryAgent: response.routingPlan.primaryAgent.name,
            supportingAgents: response.routingPlan.supportingAgents.map(agent => ({
              name: agent.name,
              role: agent.role,
              confidence: agent.confidence,
            })),
            coordinationStrategy: response.routingPlan.coordinationStrategy,
          },

          // Results
          results: {
            summary: response.synthesizedResponse.summary,
            recommendations: response.synthesizedResponse.recommendations,
            opportunities: response.synthesizedResponse.opportunities,
            riskAssessment: response.synthesizedResponse.riskAssessment,
            nextSteps: response.synthesizedResponse.nextSteps,
            confidence: response.synthesizedResponse.confidence,
          },

          // Metadata
          metadata: {
            totalExecutionTime: response.metadata.totalExecutionTime,
            agentsUsed: response.metadata.agentsUsed,
            fallbacksTriggered: response.metadata.fallbacksTriggered,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to process agentic query', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error while processing query',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async testSemanticAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.body;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Query is required and must be a string',
        });
        return;
      }

      // Test just the semantic analysis part
      const semanticRouter = this.orchestrator['semanticRouter'];
      const semanticAnalysis = await semanticRouter.analyzeSemanticIntent(query);
      const routingPlan = await semanticRouter.routeToAgents(semanticAnalysis);

      res.json({
        success: true,
        data: {
          semanticAnalysis,
          routingPlan,
        },
      });
    } catch (error) {
      logger.error('Failed to test semantic analysis', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error during semantic analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getAgentCapabilities(req: Request, res: Response): Promise<void> {
    try {
      const capabilities = {
        availableAgents: [
          {
            name: 'AgenticYieldAgent',
            description: 'Advanced AI-powered yield optimization with autonomous decision making',
            capabilities: ['yield_optimization', 'portfolio_analysis', 'cross_chain_analysis', 'autonomous_execution'],
            complexity: 'high',
            realTimeData: true,
          },
          {
            name: 'YieldAgent',
            description: 'Traditional yield farming and optimization strategies',
            capabilities: ['yield_optimization', 'liquidity_management'],
            complexity: 'medium',
            realTimeData: true,
          },
          {
            name: 'RiskAgent',
            description: 'Risk assessment and portfolio health monitoring',
            capabilities: ['risk_assessment', 'emergency_action', 'liquidation_monitoring'],
            complexity: 'high',
            realTimeData: true,
          },
          {
            name: 'GovernanceAgent',
            description: 'DAO governance participation and proposal analysis',
            capabilities: ['governance_participation', 'proposal_analysis', 'voting_power'],
            complexity: 'low',
            realTimeData: false,
          },
          {
            name: 'EnhancedYieldAgent',
            description: 'Enhanced yield strategies with Pyth price feeds',
            capabilities: ['yield_optimization', 'arbitrage_detection', 'pyth_integration'],
            complexity: 'high',
            realTimeData: true,
          },
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
          'EMERGENCY_ACTION',
        ],
        executionModes: [
          {
            mode: 'analyze_only',
            description: 'Analyze and provide recommendations without executing any blockchain transactions',
          },
          {
            mode: 'execute_with_approval',
            description: 'Plan actions and wait for user approval before execution',
          },
          {
            mode: 'autonomous',
            description: 'Fully autonomous execution with AI risk management',
          },
        ],
      };

      res.json({
        success: true,
        data: capabilities,
      });
    } catch (error) {
      logger.error('Failed to get agent capabilities', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

export default AgenticController;
