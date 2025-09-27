import MistralService from './MistralService';
import { logger } from '../utils/logger';

export interface AgenticIntent {
  type: 'yield_optimization' | 'risk_management' | 'governance_action' | 'trading_action' | 'portfolio_rebalance';
  confidence: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  parameters: Record<string, any>;
  reasoning: string;
}

export interface ActionPlan {
  actions: BlockchainAction[];
  totalGasCost: string;
  expectedReturn: string;
  riskScore: number;
  executionOrder: number[];
  reasoning: string;
}

export interface BlockchainAction {
  id: string;
  type: 'swap' | 'add_liquidity' | 'remove_liquidity' | 'stake' | 'unstake' | 'harvest' | 'vote' | 'bridge';
  protocol: string;
  chainId: number;
  parameters: Record<string, any>;
  estimatedGas: string;
  expectedReturn: string;
  riskLevel: 'low' | 'medium' | 'high';
  priority: number;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  factors: string[];
  mitigations: string[];
  shouldProceed: boolean;
  reasoning: string;
}

export interface MarketContext {
  volatility: number;
  gasPrice: string;
  marketTrend: 'bullish' | 'bearish' | 'sideways';
  liquidityConditions: 'high' | 'medium' | 'low';
  protocolHealth: Record<string, number>;
}

export class AgenticPromptService {
  private mistral: MistralService;

  constructor() {
    this.mistral = new MistralService();
  }

  // CORE AGENTIC INTELLIGENCE METHODS

  async analyzeUserIntent(query: string, userContext?: any): Promise<AgenticIntent> {
    try {
      const systemPrompt = `
You are an advanced DeFi AI agent that understands user intents and can plan autonomous blockchain actions.

Analyze the user's request and determine their intent. Consider:
- What they want to achieve (yield, risk reduction, governance participation, etc.)
- How urgent their request is
- What blockchain actions might be needed
- Their risk tolerance and preferences

User Context: ${JSON.stringify(userContext || {})}

Respond with JSON:
{
  "type": "yield_optimization" | "risk_management" | "governance_action" | "trading_action" | "portfolio_rebalance",
  "confidence": 0.95,
  "urgency": "low" | "medium" | "high" | "critical",
  "parameters": {
    "tokens": ["ETH", "USDC"],
    "targetAPY": "8%",
    "maxRisk": "medium",
    "timeframe": "1 month"
  },
  "reasoning": "User wants to optimize yield on their ETH/USDC holdings with medium risk tolerance"
}
`;

      const userPrompt = `
User Request: "${query}"

Analyze this request and determine what the user wants to achieve in DeFi. 
Consider if they want information only, or if they want me to take actions on their behalf.
`;

      const intent = await this.mistral.chatCompleteJSON<AgenticIntent>({
        system: systemPrompt,
        user: userPrompt,
        temperature: 0.2,
        maxTokens: 600,
      });

      logger.info('Analyzed user intent', {
        query,
        intent: intent.type,
        confidence: intent.confidence,
        urgency: intent.urgency,
      });

      return intent;
    } catch (error) {
      logger.error('Failed to analyze user intent', { query, error });
      return {
        type: 'yield_optimization',
        confidence: 0.1,
        urgency: 'low',
        parameters: {},
        reasoning: 'Failed to parse user intent, defaulting to yield optimization',
      };
    }
  }

  async planBlockchainActions(
    intent: AgenticIntent,
    marketContext: MarketContext,
    userPortfolio?: any
  ): Promise<ActionPlan> {
    try {
      const systemPrompt = `
You are an expert DeFi strategist that plans optimal blockchain actions to achieve user goals.

Given the user's intent and current market conditions, create a detailed action plan.

Consider:
- Current market volatility: ${marketContext.volatility}%
- Gas prices: ${marketContext.gasPrice} gwei
- Market trend: ${marketContext.marketTrend}
- Liquidity conditions: ${marketContext.liquidityConditions}

Available Actions:
- swap: Exchange tokens via DEX
- add_liquidity: Provide liquidity to pools
- remove_liquidity: Remove liquidity from pools
- stake: Stake tokens/LP tokens for rewards
- unstake: Unstake tokens/LP tokens
- harvest: Claim pending rewards
- vote: Participate in governance
- bridge: Move assets across chains

Respond with JSON:
{
  "actions": [
    {
      "id": "action_1",
      "type": "swap",
      "protocol": "Uniswap V3",
      "chainId": 1,
      "parameters": {
        "tokenIn": "ETH",
        "tokenOut": "USDC",
        "amount": "1.0",
        "slippage": "0.5%"
      },
      "estimatedGas": "150000",
      "expectedReturn": "5.2%",
      "riskLevel": "low",
      "priority": 1
    }
  ],
  "totalGasCost": "$45",
  "expectedReturn": "8.5% APY",
  "riskScore": 25,
  "executionOrder": [0, 1, 2],
  "reasoning": "Plan optimizes yield while managing gas costs and market risk"
}
`;

      const userPrompt = `
User Intent: ${JSON.stringify(intent)}
Market Context: ${JSON.stringify(marketContext)}
User Portfolio: ${JSON.stringify(userPortfolio || {})}

Create an optimal action plan to achieve the user's goals. Consider:
1. Market conditions and timing
2. Gas optimization
3. Risk management
4. Expected returns
5. Execution order

Focus on ${intent.type} with ${intent.urgency} urgency.
`;

      const actionPlan = await this.mistral.chatCompleteJSON<ActionPlan>({
        system: systemPrompt,
        user: userPrompt,
        temperature: 0.3,
        maxTokens: 1000,
      });

      logger.info('Created blockchain action plan', {
        intentType: intent.type,
        actionCount: actionPlan.actions.length,
        expectedReturn: actionPlan.expectedReturn,
        riskScore: actionPlan.riskScore,
      });

      return actionPlan;
    } catch (error) {
      logger.error('Failed to plan blockchain actions', { intent, error });
      return {
        actions: [],
        totalGasCost: '$0',
        expectedReturn: '0%',
        riskScore: 0,
        executionOrder: [],
        reasoning: 'Failed to create action plan',
      };
    }
  }

  async assessActionRisk(
    action: BlockchainAction,
    marketContext: MarketContext,
    userRiskProfile?: any
  ): Promise<RiskAssessment> {
    try {
      const systemPrompt = `
You are a DeFi risk assessment expert. Analyze blockchain actions for potential risks.

Consider these risk factors:
- Smart contract risk
- Impermanent loss risk
- Market volatility risk
- Liquidity risk
- Protocol risk
- Slippage risk
- Gas cost risk

Current Market Context:
- Volatility: ${marketContext.volatility}%
- Market Trend: ${marketContext.marketTrend}
- Liquidity: ${marketContext.liquidityConditions}

User Risk Profile: ${JSON.stringify(userRiskProfile || { tolerance: 'medium' })}

Respond with JSON:
{
  "overallRisk": "low" | "medium" | "high" | "critical",
  "riskScore": 35,
  "factors": [
    "High market volatility increases impermanent loss risk",
    "Protocol has strong security track record"
  ],
  "mitigations": [
    "Consider smaller position size",
    "Set stop-loss at 5% below entry"
  ],
  "shouldProceed": true,
  "reasoning": "Risk is manageable given user's medium risk tolerance and current market conditions"
}
`;

      const userPrompt = `
Analyze this blockchain action for risks:
${JSON.stringify(action)}

Consider:
1. Protocol security and track record
2. Market conditions and volatility
3. Potential for losses
4. User's risk tolerance
5. Timing and market trends

Provide detailed risk assessment with specific recommendations.
`;

      const riskAssessment = await this.mistral.chatCompleteJSON<RiskAssessment>({
        system: systemPrompt,
        user: userPrompt,
        temperature: 0.2,
        maxTokens: 700,
      });

      logger.info('Assessed action risk', {
        actionType: action.type,
        protocol: action.protocol,
        overallRisk: riskAssessment.overallRisk,
        riskScore: riskAssessment.riskScore,
        shouldProceed: riskAssessment.shouldProceed,
      });

      return riskAssessment;
    } catch (error) {
      logger.error('Failed to assess action risk', { action, error });
      return {
        overallRisk: 'high',
        riskScore: 80,
        factors: ['Risk assessment failed'],
        mitigations: ['Manual review required'],
        shouldProceed: false,
        reasoning: 'Unable to assess risk, defaulting to high risk',
      };
    }
  }

  async shouldExecuteAction(
    action: BlockchainAction,
    riskAssessment: RiskAssessment,
    marketContext: MarketContext
  ): Promise<{ shouldExecute: boolean; reasoning: string; alternatives?: string[] }> {
    try {
      const systemPrompt = `
You are an autonomous DeFi execution agent. Decide whether to execute blockchain actions based on risk assessment and market conditions.

Consider:
- Risk vs reward ratio
- Market timing
- Gas costs vs expected returns
- User's risk tolerance
- Alternative strategies

Current Market Context:
- Volatility: ${marketContext.volatility}%
- Gas Price: ${marketContext.gasPrice} gwei
- Market Trend: ${marketContext.marketTrend}

Make the final execution decision with clear reasoning.

Respond with JSON:
{
  "shouldExecute": true,
  "reasoning": "Risk is acceptable and market conditions are favorable for execution",
  "alternatives": [
    "Wait for lower gas prices",
    "Use different protocol with lower fees"
  ]
}
`;

      const userPrompt = `
Action to Execute: ${JSON.stringify(action)}
Risk Assessment: ${JSON.stringify(riskAssessment)}

Should I execute this action now? Consider:
1. Risk vs reward
2. Market timing
3. Gas costs
4. Better alternatives
5. Overall strategy alignment

Provide clear decision with reasoning.
`;

      const decision = await this.mistral.chatCompleteJSON<{
        shouldExecute: boolean;
        reasoning: string;
        alternatives?: string[];
      }>({
        system: systemPrompt,
        user: userPrompt,
        temperature: 0.1,
        maxTokens: 400,
      });

      logger.info('Made execution decision', {
        actionType: action.type,
        shouldExecute: decision.shouldExecute,
        riskScore: riskAssessment.riskScore,
      });

      return decision;
    } catch (error) {
      logger.error('Failed to make execution decision', { action, error });
      return {
        shouldExecute: false,
        reasoning: 'Execution decision failed, defaulting to no execution for safety',
        alternatives: ['Manual review required'],
      };
    }
  }

  // SPECIALIZED AGENT PROMPTS

  async generateYieldOptimizationStrategy(
    currentPositions: any[],
    availableOpportunities: any[],
    userPreferences: any
  ): Promise<{
    strategy: string;
    actions: string[];
    expectedAPY: string;
    riskLevel: string;
    reasoning: string;
  }> {
    try {
      const systemPrompt = `
You are an expert DeFi yield optimization strategist. Create user-friendly, actionable yield farming strategies.

CRITICAL REQUIREMENTS:
- Use ONLY real data from the provided opportunities
- NEVER use placeholder text like [X% APY] or [protocol name]
- Provide specific numbers, protocol names, and token symbols
- Write in clear, accessible language for end users
- Structure responses for maximum readability

Available Opportunities Data: ${JSON.stringify(availableOpportunities)}
User Preferences: ${JSON.stringify(userPreferences)}

Response Format Requirements:
- Strategy: One clear sentence describing the overall approach
- Actions: Specific, actionable steps with real protocol names and APY numbers
- Expected APY: Use weighted average of actual opportunity APYs
- Risk Level: Based on actual risk scores from opportunities
- Reasoning: Explain WHY this strategy works with specific data points

Respond with JSON using ONLY real data from the opportunities provided:
{
  "strategy": "Focus on high-yield stablecoin lending across Aave and Compound",
  "actions": [
    "Deposit USDC in Aave for 8.5% APY with low risk",
    "Provide ETH/USDC liquidity on Uniswap V3 for 12.3% APY"
  ],
  "expectedAPY": "10.4%",
  "riskLevel": "medium",
  "reasoning": "This strategy combines Aave's stable 8.5% USDC yield with Uniswap V3's higher 12.3% LP rewards, balancing safety and returns"
}
`;

      const userPrompt = `
Current Positions: ${JSON.stringify(currentPositions)}
Available Opportunities: ${JSON.stringify(availableOpportunities)}

Create a yield optimization strategy using ONLY the real data provided. Requirements:
1. Use actual APY numbers from the opportunities data
2. Reference specific protocols by name (Aave, Compound, Uniswap, etc.)
3. Calculate realistic expected APY based on position allocation
4. Assess risk level using the riskScore from opportunities
5. Provide clear, actionable steps that users can follow
6. Explain the reasoning with specific data points

DO NOT use any placeholder text or generic examples.
`;

      const strategy = await this.mistral.chatCompleteJSON<{
        strategy: string;
        actions: string[];
        expectedAPY: string;
        riskLevel: string;
        reasoning: string;
      }>({
        system: systemPrompt,
        user: userPrompt,
        temperature: 0.2,
        maxTokens: 800,
      });

      // Validate response to ensure no placeholders
      if (this.containsPlaceholders(JSON.stringify(strategy))) {
        return this.generateFallbackYieldStrategy(availableOpportunities);
      }

      return strategy;
    } catch (error) {
      logger.error('Failed to generate yield optimization strategy', { error });
      return this.generateFallbackYieldStrategy(availableOpportunities);
    }
  }

  private generateFallbackYieldStrategy(opportunities: any[]): {
    strategy: string;
    actions: string[];
    expectedAPY: string;
    riskLevel: string;
    reasoning: string;
  } {
    if (!opportunities || opportunities.length === 0) {
      return {
        strategy: 'Conservative approach with established protocols',
        actions: ['Monitor market conditions for better opportunities'],
        expectedAPY: '0%',
        riskLevel: 'low',
        reasoning: 'No yield opportunities currently available for analysis',
      };
    }

    const topOpportunity = opportunities[0];
    const avgAPY = opportunities.reduce((sum, opp) => sum + parseFloat(opp.apy || '0'), 0) / opportunities.length;
    const avgRisk = opportunities.reduce((sum, opp) => sum + (opp.riskScore || 0), 0) / opportunities.length;
    
    return {
      strategy: `Focus on ${topOpportunity.protocol} ${topOpportunity.category} for optimal returns`,
      actions: [
        `Consider ${topOpportunity.protocol} offering ${topOpportunity.apy}% APY on ${topOpportunity.tokenSymbol}`,
        `Evaluate ${opportunities.length} available opportunities across different protocols`
      ],
      expectedAPY: `${avgAPY.toFixed(1)}%`,
      riskLevel: avgRisk > 6 ? 'high' : avgRisk > 3 ? 'medium' : 'low',
      reasoning: `Based on analysis of ${opportunities.length} opportunities, ${topOpportunity.protocol} offers the best risk-adjusted returns at ${topOpportunity.apy}% APY`,
    };
  }

  private containsPlaceholders(text: string): boolean {
    const placeholderPatterns = [
      /\[.*?\]/g,  // [placeholder text]
      /\{.*?\}/g,  // {placeholder}
      /X%/g,       // X%
      /\$X/g,      // $X
      /protocol.*?name/gi,
      /top.*?performing/gi,
    ];
    
    return placeholderPatterns.some(pattern => pattern.test(text));
  }

  async generateRiskManagementActions(
    portfolioRisk: any,
    marketConditions: MarketContext
  ): Promise<{
    urgency: 'low' | 'medium' | 'high' | 'critical';
    actions: string[];
    reasoning: string;
  }> {
    try {
      const systemPrompt = `
You are an autonomous risk management agent. Generate immediate risk mitigation actions.

Analyze portfolio risk and market conditions to determine necessary protective actions.

Consider:
- Liquidation risks
- Concentration risks
- Market volatility
- Protocol risks
- Correlation risks

Market Conditions: ${JSON.stringify(marketConditions)}

Respond with JSON:
{
  "urgency": "high",
  "actions": [
    "Reduce leverage on high-risk positions",
    "Add collateral to prevent liquidation",
    "Diversify concentrated holdings"
  ],
  "reasoning": "High market volatility requires immediate risk reduction"
}
`;

      const userPrompt = `
Portfolio Risk Analysis: ${JSON.stringify(portfolioRisk)}

Generate immediate risk management actions based on:
1. Current risk levels
2. Market volatility
3. Liquidation threats
4. Concentration issues
5. Protocol risks

Prioritize actions by urgency and impact.
`;

      const riskActions = await this.mistral.chatCompleteJSON<{
        urgency: 'low' | 'medium' | 'high' | 'critical';
        actions: string[];
        reasoning: string;
      }>({
        system: systemPrompt,
        user: userPrompt,
        temperature: 0.2,
        maxTokens: 600,
      });

      return riskActions;
    } catch (error) {
      logger.error('Failed to generate risk management actions', { error });
      return {
        urgency: 'low',
        actions: ['Monitor positions closely'],
        reasoning: 'Risk action generation failed, defaulting to monitoring',
      };
    }
  }
}

export default AgenticPromptService;
