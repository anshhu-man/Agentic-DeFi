import { logger } from '../utils/logger';
import SemanticRouterService, { 
  SemanticIntent, 
  AgentRoutingPlan, 
  UserProfile 
} from './SemanticRouterService';
import AgenticYieldAgent, { AgenticYieldRequest, AgenticYieldResponse } from '../agents/AgenticYieldAgent';
import YieldAgent from '../agents/YieldAgent';
import RiskAgent from '../agents/RiskAgent';
import GovernanceAgent from '../agents/GovernanceAgent';
import EnhancedYieldAgent from '../agents/EnhancedYieldAgent';
import GraphService from './GraphService';
import PythService from './PythService';
import { YieldOpportunity, AgentTask } from '../types';

export interface OrchestrationRequest {
  query: string;
  userAddress?: string;
  userProfile?: UserProfile;
  conversationHistory?: string[];
  mode: 'analyze_only' | 'execute_with_approval' | 'autonomous';
}

export interface OrchestrationResponse {
  success: boolean;
  semanticAnalysis: SemanticIntent;
  routingPlan: AgentRoutingPlan;
  agentResponses: Array<{
    agentName: string;
    role: string;
    response: any;
    executionTime: number;
    success: boolean;
    error?: string;
  }>;
  synthesizedResponse: {
    summary: string;
    recommendations: string[];
    opportunities?: YieldOpportunity[];
    riskAssessment?: string;
    nextSteps: string[];
    confidence: number;
  };
  metadata: {
    totalExecutionTime: number;
    agentsUsed: string[];
    coordinationStrategy: string;
    fallbacksTriggered: string[];
  };
}

export class AgenticOrchestrator {
  private semanticRouter: SemanticRouterService;
  private agents: Map<string, any> = new Map();

  constructor() {
    this.semanticRouter = new SemanticRouterService();
    this.initializeAgents();
  }

  private initializeAgents() {
    this.agents = new Map();
    
    // Initialize all available agents with proper constructors
    try {
      // Initialize services needed by agents
      const graphService = new GraphService();
      const pythService = new PythService();
      
      // Initialize agents with proper parameters
      this.agents.set('AgenticYieldAgent', new AgenticYieldAgent());
      this.agents.set('YieldAgent', new YieldAgent(graphService, pythService));
      this.agents.set('EnhancedYieldAgent', new EnhancedYieldAgent());
      
      // Skip problematic agents for now
      // this.agents.set('RiskAgent', new RiskAgent(pythService));
      // this.agents.set('GovernanceAgent', new GovernanceAgent(graphService));
    } catch (error) {
      logger.error('Failed to initialize some agents', { error });
      // Initialize with minimal agents that work
      this.agents.set('AgenticYieldAgent', new AgenticYieldAgent());
    }

    logger.info('Agentic orchestrator initialized', {
      availableAgents: Array.from(this.agents.keys()),
    });
  }

  async processRequest(request: OrchestrationRequest): Promise<OrchestrationResponse> {
    const startTime = Date.now();
    const fallbacksTriggered: string[] = [];

    try {
      logger.info('Processing orchestration request', {
        query: request.query,
        mode: request.mode,
        userAddress: request.userAddress,
        hasUserProfile: !!request.userProfile,
      });

      // STEP 1: Semantic Intent Analysis
      const semanticAnalysis = await this.semanticRouter.analyzeSemanticIntent(
        request.query,
        {
          conversationHistory: request.conversationHistory,
          userProfile: request.userProfile,
        }
      );

      logger.info('Semantic analysis completed', {
        primaryIntent: semanticAnalysis.primary.type,
        confidence: semanticAnalysis.primary.confidence,
        complexity: semanticAnalysis.secondary.complexity,
      });

      // STEP 2: Agent Routing
      const routingPlan = await this.semanticRouter.routeToAgents(semanticAnalysis);

      logger.info('Agent routing completed', {
        primaryAgent: routingPlan.primaryAgent.name,
        supportingAgents: routingPlan.supportingAgents.length,
        coordinationStrategy: routingPlan.coordinationStrategy,
      });

      // STEP 3: Execute Agents Based on Coordination Strategy
      const agentResponses = await this.executeAgents(
        routingPlan,
        semanticAnalysis,
        request,
        fallbacksTriggered
      );

      // STEP 4: Synthesize Final Response
      const synthesizedResponse = await this.synthesizeResponse(
        agentResponses,
        semanticAnalysis,
        routingPlan
      );

      const totalExecutionTime = Date.now() - startTime;

      const response: OrchestrationResponse = {
        success: true,
        semanticAnalysis,
        routingPlan,
        agentResponses,
        synthesizedResponse,
        metadata: {
          totalExecutionTime,
          agentsUsed: agentResponses.map(r => r.agentName),
          coordinationStrategy: routingPlan.coordinationStrategy,
          fallbacksTriggered,
        },
      };

      logger.info('Orchestration completed successfully', {
        totalExecutionTime,
        agentsUsed: response.metadata.agentsUsed,
        confidence: synthesizedResponse.confidence,
        fallbacksTriggered: fallbacksTriggered.length,
      });

      return response;
    } catch (error) {
      logger.error('Orchestration failed', {
        query: request.query,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
      });

      // Return error response with fallback
      return this.createErrorResponse(request, error, fallbacksTriggered);
    }
  }

  private async executeAgents(
    routingPlan: AgentRoutingPlan,
    semanticAnalysis: SemanticIntent,
    request: OrchestrationRequest,
    fallbacksTriggered: string[]
  ): Promise<Array<{
    agentName: string;
    role: string;
    response: any;
    executionTime: number;
    success: boolean;
    error?: string;
  }>> {
    const responses: Array<{
      agentName: string;
      role: string;
      response: any;
      executionTime: number;
      success: boolean;
      error?: string;
    }> = [];

    try {
      if (routingPlan.coordinationStrategy === 'sequential') {
        // Execute agents sequentially
        for (const agentName of routingPlan.executionOrder) {
          const agentResponse = await this.executeAgent(
            agentName,
            this.getAgentRole(agentName, routingPlan),
            semanticAnalysis,
            request,
            responses // Pass previous responses for context
          );
          
          responses.push(agentResponse);

          // If primary agent fails, try fallback
          if (!agentResponse.success && agentName === routingPlan.primaryAgent.name) {
            const fallbackResponse = await this.tryFallbackAgents(
              routingPlan.fallbackPlan,
              semanticAnalysis,
              request,
              fallbacksTriggered
            );
            if (fallbackResponse) {
              responses.push(fallbackResponse);
            }
          }
        }
      } else if (routingPlan.coordinationStrategy === 'parallel') {
        // Execute agents in parallel
        const agentPromises = routingPlan.executionOrder.map(agentName =>
          this.executeAgent(
            agentName,
            this.getAgentRole(agentName, routingPlan),
            semanticAnalysis,
            request,
            []
          )
        );

        const parallelResponses = await Promise.allSettled(agentPromises);
        
        parallelResponses.forEach((result, index) => {
          const agentName = routingPlan.executionOrder[index];
          if (result.status === 'fulfilled') {
            responses.push(result.value);
          } else {
            responses.push({
              agentName,
              role: this.getAgentRole(agentName, routingPlan),
              response: null,
              executionTime: 0,
              success: false,
              error: result.reason?.message || 'Parallel execution failed',
            });
          }
        });
      } else {
        // Conditional execution - execute primary first, then decide on supporting agents
        const primaryResponse = await this.executeAgent(
          routingPlan.primaryAgent.name,
          'primary',
          semanticAnalysis,
          request,
          []
        );
        
        responses.push(primaryResponse);

        // Execute supporting agents based on primary agent results
        if (primaryResponse.success) {
          for (const supportingAgent of routingPlan.supportingAgents) {
            const supportingResponse = await this.executeAgent(
              supportingAgent.name,
              supportingAgent.role,
              semanticAnalysis,
              request,
              responses
            );
            responses.push(supportingResponse);
          }
        }
      }

      return responses;
    } catch (error) {
      logger.error('Agent execution failed', { error });
      return responses; // Return partial responses
    }
  }

  private async executeAgent(
    agentName: string,
    role: string,
    semanticAnalysis: SemanticIntent,
    request: OrchestrationRequest,
    previousResponses: any[]
  ): Promise<{
    agentName: string;
    role: string;
    response: any;
    executionTime: number;
    success: boolean;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      logger.info('Executing agent', { agentName, role });

      const agent = this.agents.get(agentName);
      if (!agent) {
        throw new Error(`Agent ${agentName} not found`);
      }

      let response: any;

      // Handle different agent types and execution modes
      if (agentName === 'AgenticYieldAgent') {
        // Use the agentic agent's processAgenticRequest method
        const agenticRequest: AgenticYieldRequest = {
          query: request.query,
          userAddress: request.userAddress,
          userContext: request.userProfile ? {
            riskTolerance: request.userProfile.riskTolerance,
            portfolioSize: request.userProfile.portfolioSize,
            experience: request.userProfile.experienceLevel,
            preferences: request.userProfile.preferredProtocols,
          } : undefined,
          executionMode: request.mode,
        };

        response = await agent.processAgenticRequest(agenticRequest);
      } else {
        // Use legacy agent interface
        const agentType = this.mapAgentNameToType(agentName);
        const agentTask: AgentTask = {
          agentType,
          action: this.mapIntentToAction(semanticAnalysis.primary.type),
          parameters: {
            tokens: semanticAnalysis.entities.tokens,
            protocols: semanticAnalysis.entities.protocols,
            chains: semanticAnalysis.entities.chains,
            amounts: semanticAnalysis.entities.amounts,
            riskTolerance: semanticAnalysis.secondary.riskTolerance,
            timeHorizon: semanticAnalysis.secondary.timeHorizon,
            urgency: semanticAnalysis.secondary.urgency,
          },
          priority: semanticAnalysis.secondary.urgency === 'critical' ? 1 : 
                   semanticAnalysis.secondary.urgency === 'high' ? 2 : 3,
        };

        response = await agent.execute(agentTask);
      }

      const executionTime = Date.now() - startTime;

      logger.info('Agent execution completed', {
        agentName,
        role,
        executionTime,
        success: true,
      });

      return {
        agentName,
        role,
        response,
        executionTime,
        success: true,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Agent execution failed', {
        agentName,
        role,
        error: errorMessage,
        executionTime,
      });

      return {
        agentName,
        role,
        response: null,
        executionTime,
        success: false,
        error: errorMessage,
      };
    }
  }

  private async tryFallbackAgents(
    fallbackPlan: string[],
    semanticAnalysis: SemanticIntent,
    request: OrchestrationRequest,
    fallbacksTriggered: string[]
  ): Promise<any> {
    for (const fallbackAgentName of fallbackPlan) {
      try {
        logger.info('Trying fallback agent', { fallbackAgentName });
        
        const fallbackResponse = await this.executeAgent(
          fallbackAgentName,
          'fallback',
          semanticAnalysis,
          request,
          []
        );

        if (fallbackResponse.success) {
          fallbacksTriggered.push(fallbackAgentName);
          logger.info('Fallback agent succeeded', { fallbackAgentName });
          return fallbackResponse;
        }
      } catch (error) {
        logger.warn('Fallback agent failed', {
          fallbackAgentName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        continue;
      }
    }

    return null;
  }

  private getAgentRole(agentName: string, routingPlan: AgentRoutingPlan): string {
    if (agentName === routingPlan.primaryAgent.name) {
      return 'primary';
    }

    const supportingAgent = routingPlan.supportingAgents.find(agent => agent.name === agentName);
    return supportingAgent?.role || 'unknown';
  }

  private mapAgentNameToType(agentName: string): 'yield' | 'risk' | 'governance' {
    const nameToTypeMap: Record<string, 'yield' | 'risk' | 'governance'> = {
      'YieldAgent': 'yield',
      'AgenticYieldAgent': 'yield',
      'EnhancedYieldAgent': 'yield',
      'RiskAgent': 'risk',
      'GovernanceAgent': 'governance',
    };

    return nameToTypeMap[agentName] || 'yield';
  }

  private mapIntentToAction(intentType: string): string {
    const intentActionMap: Record<string, string> = {
      'YIELD_OPTIMIZATION': 'find_yield_opportunities',
      'RISK_ASSESSMENT': 'assess_risk',
      'GOVERNANCE_PARTICIPATION': 'find_governance_opportunities',
      'PORTFOLIO_ANALYSIS': 'analyze_portfolio',
      'MARKET_INTELLIGENCE': 'get_market_data',
      'CROSS_CHAIN_ANALYSIS': 'compare_chains',
      'ARBITRAGE_DETECTION': 'find_arbitrage',
      'LIQUIDITY_MANAGEMENT': 'manage_liquidity',
      'EMERGENCY_ACTION': 'emergency_response',
    };

    return intentActionMap[intentType] || 'general_query';
  }

  private async synthesizeResponse(
    agentResponses: Array<{
      agentName: string;
      role: string;
      response: any;
      executionTime: number;
      success: boolean;
      error?: string;
    }>,
    semanticAnalysis: SemanticIntent,
    routingPlan: AgentRoutingPlan
  ): Promise<{
    summary: string;
    recommendations: string[];
    opportunities?: YieldOpportunity[];
    riskAssessment?: string;
    nextSteps: string[];
    confidence: number;
  }> {
    try {
      // Find the primary successful response
      const primaryResponse = agentResponses.find(
        r => r.role === 'primary' && r.success
      ) || agentResponses.find(r => r.success);

      if (!primaryResponse) {
        return {
          summary: 'Unable to process your request at this time. All agents failed to provide a response.',
          recommendations: ['Please try rephrasing your query', 'Check system status', 'Contact support'],
          nextSteps: ['Retry with a simpler query', 'Check network connectivity'],
          confidence: 0.1,
        };
      }

      // Extract data from successful responses
      const opportunities: YieldOpportunity[] = [];
      const recommendations: string[] = [];
      let riskAssessment = '';
      const nextSteps: string[] = [];

      for (const agentResponse of agentResponses.filter(r => r.success)) {
        const response = agentResponse.response;

        // Extract opportunities
        if (response.opportunities) {
          opportunities.push(...response.opportunities);
        }
        if (response.analysis?.opportunities) {
          opportunities.push(...response.analysis.opportunities);
        }

        // Extract recommendations
        if (response.recommendations) {
          recommendations.push(...response.recommendations);
        }
        if (response.analysis?.recommendations) {
          recommendations.push(...response.analysis.recommendations);
        }

        // Extract risk assessment
        if (response.riskAssessment) {
          riskAssessment = response.riskAssessment;
        }
        if (response.analysis?.riskAssessment) {
          riskAssessment = response.analysis.riskAssessment;
        }

        // Extract next steps
        if (response.nextSteps) {
          nextSteps.push(...response.nextSteps);
        }
      }

      // Generate summary
      const summary = this.generateSummary(
        semanticAnalysis,
        agentResponses,
        opportunities,
        recommendations
      );

      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(
        semanticAnalysis,
        routingPlan,
        agentResponses
      );

      return {
        summary,
        recommendations: [...new Set(recommendations)], // Remove duplicates
        opportunities: opportunities.length > 0 ? opportunities : undefined,
        riskAssessment: riskAssessment || undefined,
        nextSteps: [...new Set(nextSteps)], // Remove duplicates
        confidence,
      };
    } catch (error) {
      logger.error('Response synthesis failed', { error });
      
      return {
        summary: 'Response synthesis failed, but some agent data may be available.',
        recommendations: ['Review individual agent responses', 'Try a simpler query'],
        nextSteps: ['Check logs for detailed error information'],
        confidence: 0.2,
      };
    }
  }

  private generateSummary(
    semanticAnalysis: SemanticIntent,
    agentResponses: any[],
    opportunities: YieldOpportunity[],
    recommendations: string[]
  ): string {
    const successfulAgents = agentResponses.filter(r => r.success).length;
    const totalAgents = agentResponses.length;
    
    let summary = `Analyzed your ${semanticAnalysis.primary.type.toLowerCase().replace('_', ' ')} request `;
    summary += `with ${Math.round(semanticAnalysis.primary.confidence * 100)}% confidence. `;
    
    if (opportunities.length > 0) {
      summary += `Found ${opportunities.length} relevant opportunities. `;
    }
    
    if (recommendations.length > 0) {
      summary += `Generated ${recommendations.length} actionable recommendations. `;
    }
    
    summary += `Successfully processed using ${successfulAgents}/${totalAgents} agents.`;
    
    return summary;
  }

  private calculateOverallConfidence(
    semanticAnalysis: SemanticIntent,
    routingPlan: AgentRoutingPlan,
    agentResponses: any[]
  ): number {
    const intentConfidence = semanticAnalysis.primary.confidence;
    const routingConfidence = routingPlan.primaryAgent.confidence;
    const executionSuccess = agentResponses.filter(r => r.success).length / agentResponses.length;
    
    // Weighted average of different confidence factors
    const overallConfidence = (
      intentConfidence * 0.4 +
      routingConfidence * 0.3 +
      executionSuccess * 0.3
    );
    
    return Math.round(overallConfidence * 100) / 100;
  }

  private createErrorResponse(
    request: OrchestrationRequest,
    error: any,
    fallbacksTriggered: string[]
  ): OrchestrationResponse {
    return {
      success: false,
      semanticAnalysis: {
        primary: {
          type: 'MARKET_INTELLIGENCE',
          confidence: 0.1,
          semanticScore: 0.1,
          reasoning: 'Error occurred during processing',
        },
        secondary: {
          urgency: 'low',
          riskTolerance: 'medium',
          timeHorizon: 'medium',
          complexity: 1,
        },
        entities: {
          tokens: [],
          protocols: [],
          chains: [],
          amounts: [],
          confidence: 0.1,
        },
        context: {
          implicitNeeds: [],
        },
      },
      routingPlan: {
        primaryAgent: {
          name: 'AgenticYieldAgent',
          confidence: 0.1,
          reasoning: 'Fallback due to error',
        },
        supportingAgents: [],
        executionOrder: ['AgenticYieldAgent'],
        coordinationStrategy: 'sequential',
        fallbackPlan: [],
      },
      agentResponses: [],
      synthesizedResponse: {
        summary: `Failed to process request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recommendations: ['Try rephrasing your query', 'Check system status', 'Contact support'],
        nextSteps: ['Retry with a simpler query', 'Check network connectivity'],
        confidence: 0.1,
      },
      metadata: {
        totalExecutionTime: 0,
        agentsUsed: [],
        coordinationStrategy: 'sequential',
        fallbacksTriggered,
      },
    };
  }
}

export default AgenticOrchestrator;
