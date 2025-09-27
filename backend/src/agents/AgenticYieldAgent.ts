import { logger } from '../utils/logger';
import AgenticPromptService, { 
  AgenticIntent, 
  ActionPlan, 
  BlockchainAction, 
  MarketContext 
} from '../services/AgenticPromptService';
import BlockchainActionService, { TransactionResult } from '../services/BlockchainActionService';
import EnhancedPythService from '../services/EnhancedPythService';
import { YieldOpportunity, AgentTask } from '../types';

export interface AgenticYieldRequest {
  query: string;
  userAddress?: string;
  userContext?: {
    riskTolerance: 'low' | 'medium' | 'high';
    portfolioSize: 'small' | 'medium' | 'large';
    experience: 'beginner' | 'intermediate' | 'expert';
    preferences: string[];
  };
  executionMode: 'analyze_only' | 'execute_with_approval' | 'autonomous';
}

export interface AgenticYieldResponse {
  intent: AgenticIntent;
  actionPlan: ActionPlan;
  analysis: {
    opportunities: YieldOpportunity[];
    marketConditions: MarketContext;
    recommendations: string[];
    riskAssessment: string;
  };
  executionResults?: TransactionResult[];
  summary: string;
  nextSteps: string[];
}

export class AgenticYieldAgent {
  private promptService: AgenticPromptService;
  private blockchainService: BlockchainActionService;
  private pythService: EnhancedPythService;

  constructor() {
    this.promptService = new AgenticPromptService();
    this.blockchainService = new BlockchainActionService();
    this.pythService = new EnhancedPythService();
  }

  async processAgenticRequest(request: AgenticYieldRequest): Promise<AgenticYieldResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Processing agentic yield request', {
        query: request.query,
        executionMode: request.executionMode,
        userAddress: request.userAddress,
      });

      // STEP 1: Analyze user intent with AI
      const intent = await this.promptService.analyzeUserIntent(
        request.query, 
        request.userContext
      );

      // STEP 2: Gather market context
      const marketContext = await this.gatherMarketContext();

      // STEP 3: Get current yield opportunities
      const opportunities = await this.findYieldOpportunities(intent, marketContext);

      // STEP 4: Plan blockchain actions with AI
      const actionPlan = await this.promptService.planBlockchainActions(
        intent,
        marketContext,
        { opportunities, userAddress: request.userAddress }
      );

      // STEP 5: Generate comprehensive analysis
      const analysis = await this.generateAnalysis(
        opportunities,
        marketContext,
        intent,
        request.userContext
      );

      // STEP 6: Execute actions based on mode
      let executionResults: TransactionResult[] | undefined;
      
      if (request.executionMode === 'autonomous' && actionPlan.actions.length > 0) {
        executionResults = await this.executeActionsAutonomously(
          actionPlan.actions,
          marketContext
        );
      } else if (request.executionMode === 'execute_with_approval') {
        // In a real implementation, this would wait for user approval
        logger.info('Actions planned, awaiting user approval', {
          actionCount: actionPlan.actions.length,
        });
      }

      // STEP 7: Generate summary and next steps
      const summary = await this.generateSummary(
        intent,
        actionPlan,
        analysis,
        executionResults
      );

      const nextSteps = await this.generateNextSteps(
        intent,
        actionPlan,
        executionResults,
        request.executionMode
      );

      const response: AgenticYieldResponse = {
        intent,
        actionPlan,
        analysis,
        executionResults,
        summary,
        nextSteps,
      };

      const executionTime = Date.now() - startTime;
      
      logger.info('Agentic yield request completed', {
        executionTime,
        intentType: intent.type,
        actionCount: actionPlan.actions.length,
        opportunityCount: opportunities.length,
        executed: !!executionResults,
      });

      return response;
    } catch (error) {
      logger.error('Failed to process agentic yield request', {
        query: request.query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return error response
      return {
        intent: {
          type: 'yield_optimization',
          confidence: 0,
          urgency: 'low',
          parameters: {},
          reasoning: 'Failed to process request',
        },
        actionPlan: {
          actions: [],
          totalGasCost: '$0',
          expectedReturn: '0%',
          riskScore: 0,
          executionOrder: [],
          reasoning: 'Request processing failed',
        },
        analysis: {
          opportunities: [],
          marketConditions: await this.getDefaultMarketContext(),
          recommendations: ['Please try again or rephrase your request'],
          riskAssessment: 'Unable to assess risk',
        },
        summary: 'Unable to process your request at this time. Please try again.',
        nextSteps: ['Rephrase your request', 'Check system status', 'Contact support'],
      };
    }
  }

  private async gatherMarketContext(): Promise<MarketContext> {
    try {
      // Get real-time market data using the correct method
      const priceMap = await this.pythService.getMultipleTokenPrices(['ETH', 'BTC'], 1);
      
      const ethPriceData = priceMap.get('ETH');
      const btcPriceData = priceMap.get('BTC');
      
      // Calculate market volatility (simplified)
      const volatility = Math.random() * 20 + 10; // Mock volatility 10-30%
      
      // Assess market conditions
      const marketTrend = volatility > 25 ? 'bearish' : volatility < 15 ? 'bullish' : 'sideways';
      const liquidityConditions = volatility > 20 ? 'low' : 'high';

      logger.info('Market context gathered', {
        ethPrice: ethPriceData?.price,
        btcPrice: btcPriceData?.price,
        volatility,
        marketTrend
      });

      return {
        volatility,
        gasPrice: '20', // Would get from actual gas tracker
        marketTrend,
        liquidityConditions,
        protocolHealth: {
          aave: 95,
          compound: 90,
          uniswap: 98,
          curve: 92,
        },
      };
    } catch (error) {
      logger.error('Failed to gather market context', { error });
      return this.getDefaultMarketContext();
    }
  }

  private async getDefaultMarketContext(): Promise<MarketContext> {
    return {
      volatility: 15,
      gasPrice: '20',
      marketTrend: 'sideways',
      liquidityConditions: 'medium',
      protocolHealth: {
        aave: 90,
        compound: 85,
        uniswap: 95,
      },
    };
  }

  private async findYieldOpportunities(
    intent: AgenticIntent,
    marketContext: MarketContext
  ): Promise<YieldOpportunity[]> {
    try {
      const tokens = intent.parameters.tokens || ['ETH', 'USDC', 'USDT'];
      const chains = intent.parameters.chains || ['ethereum', 'polygon'];
      
      // Mock yield opportunities - in production, this would query real protocols
      const opportunities: YieldOpportunity[] = [
        {
          protocol: 'Aave',
          chainId: 1,
          tokenAddress: '0xA0b86a33E6441b8e8C7F94D0b9A3B3e0C6C6D8E8',
          tokenSymbol: 'USDC',
          apy: '8.5',
          tvl: '50000000',
          riskScore: 2,
          category: 'lending',
          metadata: {
            utilizationRate: '75%',
            confidence: 95,
          },
        },
        {
          protocol: 'Uniswap V3',
          chainId: 1,
          tokenAddress: '0xB0b86a33E6441b8e8C7F94D0b9A3B3e0C6C6D8E8',
          tokenSymbol: 'ETH/USDC',
          apy: '12.3',
          tvl: '25000000',
          riskScore: 4,
          category: 'liquidity_pool',
          impermanentLossRisk: 'medium',
          metadata: {
            feeTier: '0.3%',
            confidence: 88,
          },
        },
        {
          protocol: 'Compound',
          chainId: 137,
          tokenAddress: '0xC0b86a33E6441b8e8C7F94D0b9A3B3e0C6C6D8E8',
          tokenSymbol: 'USDT',
          apy: '6.8',
          tvl: '15000000',
          riskScore: 3,
          category: 'lending',
          metadata: {
            utilizationRate: '65%',
            confidence: 92,
          },
        },
      ];

      // Filter based on market conditions and user preferences
      return opportunities.filter(opp => {
        if (marketContext.volatility > 25 && opp.riskScore > 5) return false;
        if (marketContext.liquidityConditions === 'low' && opp.category === 'liquidity_pool') return false;
        return true;
      });
    } catch (error) {
      logger.error('Failed to find yield opportunities', { error });
      return [];
    }
  }

  private async generateAnalysis(
    opportunities: YieldOpportunity[],
    marketContext: MarketContext,
    intent: AgenticIntent,
    userContext?: any
  ): Promise<AgenticYieldResponse['analysis']> {
    try {
      // Generate AI-powered recommendations
      const strategy = await this.promptService.generateYieldOptimizationStrategy(
        [], // current positions - would be fetched in real implementation
        opportunities,
        userContext || { riskTolerance: 'medium' }
      );

      // Generate risk assessment
      const riskActions = await this.promptService.generateRiskManagementActions(
        { overallRiskScore: 5 }, // mock portfolio risk
        marketContext
      );

      return {
        opportunities,
        marketConditions: marketContext,
        recommendations: strategy.actions,
        riskAssessment: `${strategy.riskLevel} risk strategy with ${strategy.expectedAPY} expected APY. ${riskActions.reasoning}`,
      };
    } catch (error) {
      logger.error('Failed to generate analysis', { error });
      return {
        opportunities,
        marketConditions: marketContext,
        recommendations: ['Unable to generate recommendations'],
        riskAssessment: 'Risk assessment unavailable',
      };
    }
  }

  private async executeActionsAutonomously(
    actions: BlockchainAction[],
    marketContext: MarketContext
  ): Promise<TransactionResult[]> {
    const results: TransactionResult[] = [];
    
    try {
      for (const action of actions) {
        // Assess risk before execution
        const riskAssessment = await this.promptService.assessActionRisk(
          action,
          marketContext
        );

        // Make execution decision
        const decision = await this.promptService.shouldExecuteAction(
          action,
          riskAssessment,
          marketContext
        );

        if (decision.shouldExecute && riskAssessment.shouldProceed) {
          logger.info('Executing blockchain action autonomously', {
            actionId: action.id,
            type: action.type,
            protocol: action.protocol,
          });

          const result = await this.blockchainService.executeAction(action);
          results.push(result);

          // Stop execution if critical action fails
          if (!result.success && action.priority === 1) {
            logger.warn('Critical action failed, stopping autonomous execution', {
              actionId: action.id,
              error: result.error,
            });
            break;
          }
        } else {
          logger.info('Skipping action execution due to risk assessment', {
            actionId: action.id,
            shouldExecute: decision.shouldExecute,
            shouldProceed: riskAssessment.shouldProceed,
            reasoning: decision.reasoning,
          });

          results.push({
            success: false,
            error: `Action skipped: ${decision.reasoning}`,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to execute actions autonomously', { error });
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
      });
    }

    return results;
  }

  private async generateSummary(
    intent: AgenticIntent,
    actionPlan: ActionPlan,
    analysis: AgenticYieldResponse['analysis'],
    executionResults?: TransactionResult[]
  ): Promise<string> {
    try {
      const context = {
        intent: intent.type,
        confidence: intent.confidence,
        actionCount: actionPlan.actions.length,
        opportunityCount: analysis.opportunities.length,
        executed: !!executionResults,
        successfulExecutions: executionResults?.filter(r => r.success).length || 0,
      };

      const systemPrompt = `
You are an AI assistant that creates concise summaries of agentic DeFi operations.

Create a clear, informative summary of what was accomplished:
- User's intent and confidence level
- Opportunities identified
- Actions planned and executed
- Key outcomes and results

Be specific about numbers and outcomes. Use a professional but accessible tone.
`;

      const userPrompt = `
Summarize this agentic DeFi operation:
- Intent: ${intent.type} (${intent.confidence * 100}% confidence)
- Opportunities found: ${analysis.opportunities.length}
- Actions planned: ${actionPlan.actions.length}
- Expected return: ${actionPlan.expectedReturn}
- Risk score: ${actionPlan.riskScore}/100
- Executed: ${executionResults ? 'Yes' : 'No'}
- Successful executions: ${executionResults?.filter(r => r.success).length || 0}

Create a 2-3 sentence summary of the key outcomes.
`;

      const summary = await this.promptService['mistral'].chatComplete({
        system: systemPrompt,
        user: userPrompt,
        temperature: 0.3,
        maxTokens: 200,
      });

      return summary || this.generateFallbackSummary(context);
    } catch (error) {
      logger.error('Failed to generate AI summary', { error });
      return this.generateFallbackSummary({
        intent: intent.type,
        actionCount: actionPlan.actions.length,
        opportunityCount: analysis.opportunities.length,
      });
    }
  }

  private generateFallbackSummary(context: any): string {
    return `Analyzed ${context.opportunityCount} yield opportunities for ${context.intent}. ` +
           `Planned ${context.actionCount} blockchain actions with expected returns. ` +
           `${context.executed ? `Successfully executed ${context.successfulExecutions} actions.` : 'Actions ready for execution.'}`;
  }

  private async generateNextSteps(
    intent: AgenticIntent,
    actionPlan: ActionPlan,
    executionResults?: TransactionResult[],
    executionMode?: string
  ): Promise<string[]> {
    const nextSteps: string[] = [];

    if (!executionResults && actionPlan.actions.length > 0) {
      if (executionMode === 'analyze_only') {
        nextSteps.push('Review the action plan and decide whether to execute');
        nextSteps.push('Consider switching to execution mode for autonomous operation');
      } else {
        nextSteps.push('Approve the planned actions for execution');
        nextSteps.push('Monitor execution progress and results');
      }
    }

    if (executionResults) {
      const successful = executionResults.filter(r => r.success).length;
      const failed = executionResults.length - successful;

      if (successful > 0) {
        nextSteps.push(`Monitor ${successful} successful transaction(s) for completion`);
        nextSteps.push('Track yield generation and performance metrics');
      }

      if (failed > 0) {
        nextSteps.push(`Review ${failed} failed transaction(s) and retry if needed`);
      }
    }

    nextSteps.push('Set up monitoring for position changes and market conditions');
    nextSteps.push('Consider rebalancing based on performance after 24-48 hours');

    return nextSteps;
  }

  // Legacy compatibility method for existing AgentTask interface
  async execute(task: AgentTask): Promise<any> {
    try {
      // Convert legacy task to agentic request
      const request: AgenticYieldRequest = {
        query: `Execute ${task.action} with parameters: ${JSON.stringify(task.parameters)}`,
        executionMode: 'analyze_only',
      };

      const response = await this.processAgenticRequest(request);
      
      // Return in legacy format
      return {
        opportunities: response.analysis.opportunities,
        actionPlan: response.actionPlan,
        summary: response.summary,
        recommendations: response.analysis.recommendations,
      };
    } catch (error) {
      logger.error('Legacy execute method failed', { task, error });
      throw error;
    }
  }
}

export default AgenticYieldAgent;
