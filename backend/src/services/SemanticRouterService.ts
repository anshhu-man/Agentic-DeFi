import MistralService from './MistralService';
import { logger } from '../utils/logger';

export interface SemanticIntent {
  primary: {
    type: IntentType;
    confidence: number;
    semanticScore: number;
    reasoning: string;
  };
  secondary: {
    urgency: 'low' | 'medium' | 'high' | 'critical';
    riskTolerance: 'low' | 'medium' | 'high';
    timeHorizon: 'short' | 'medium' | 'long';
    complexity: number; // 1-10 scale
  };
  entities: {
    tokens: string[];
    protocols: string[];
    chains: string[];
    amounts: string[];
    confidence: number;
  };
  context: {
    conversationHistory?: string[];
    userProfile?: UserProfile;
    marketConditions?: any;
    implicitNeeds: string[];
  };
}

export type IntentType = 
  | 'YIELD_OPTIMIZATION'
  | 'RISK_ASSESSMENT' 
  | 'GOVERNANCE_PARTICIPATION'
  | 'PORTFOLIO_ANALYSIS'
  | 'MARKET_INTELLIGENCE'
  | 'CROSS_CHAIN_ANALYSIS'
  | 'ARBITRAGE_DETECTION'
  | 'LIQUIDITY_MANAGEMENT'
  | 'EMERGENCY_ACTION';

export interface UserProfile {
  riskTolerance: 'low' | 'medium' | 'high';
  experienceLevel: 'beginner' | 'intermediate' | 'expert';
  portfolioSize: 'small' | 'medium' | 'large';
  preferredChains: string[];
  preferredProtocols: string[];
}

export interface AgentCapability {
  primaryIntents: IntentType[];
  secondaryCapabilities: string[];
  dataRequirements: string[];
  complexity: 'low' | 'medium' | 'high';
  realTimeData: boolean;
  executionCapable: boolean;
}

export interface AgentRoutingPlan {
  primaryAgent: {
    name: string;
    confidence: number;
    reasoning: string;
  };
  supportingAgents: Array<{
    name: string;
    role: 'validation' | 'data_provider' | 'risk_checker' | 'executor';
    confidence: number;
  }>;
  executionOrder: string[];
  coordinationStrategy: 'sequential' | 'parallel' | 'conditional';
  fallbackPlan: string[];
}

export class SemanticRouterService {
  private mistral: MistralService;
  private agentCapabilities: Record<string, AgentCapability> = {};

  constructor() {
    this.mistral = new MistralService();
    this.initializeAgentCapabilities();
  }

  private initializeAgentCapabilities() {
    this.agentCapabilities = {
      YieldAgent: {
        primaryIntents: ['YIELD_OPTIMIZATION', 'LIQUIDITY_MANAGEMENT'],
        secondaryCapabilities: ['cross_chain_comparison', 'apy_calculation', 'protocol_analysis'],
        dataRequirements: ['protocols', 'tokens', 'chains', 'market_data'],
        complexity: 'medium',
        realTimeData: true,
        executionCapable: true
      },
      EnhancedYieldAgent: {
        primaryIntents: ['YIELD_OPTIMIZATION', 'ARBITRAGE_DETECTION'],
        secondaryCapabilities: ['pyth_integration', 'confidence_scoring', 'optimal_sizing'],
        dataRequirements: ['protocols', 'tokens', 'chains', 'price_feeds'],
        complexity: 'high',
        realTimeData: true,
        executionCapable: true
      },
      RiskAgent: {
        primaryIntents: ['RISK_ASSESSMENT', 'EMERGENCY_ACTION'],
        secondaryCapabilities: ['liquidation_monitoring', 'portfolio_health', 'concentration_risk'],
        dataRequirements: ['positions', 'protocols', 'market_data', 'price_feeds'],
        complexity: 'high',
        realTimeData: true,
        executionCapable: false
      },
      GovernanceAgent: {
        primaryIntents: ['GOVERNANCE_PARTICIPATION'],
        secondaryCapabilities: ['proposal_analysis', 'voting_power', 'delegation'],
        dataRequirements: ['protocols', 'governance_tokens', 'proposals'],
        complexity: 'low',
        realTimeData: false,
        executionCapable: true
      },
      AgenticYieldAgent: {
        primaryIntents: ['YIELD_OPTIMIZATION', 'PORTFOLIO_ANALYSIS', 'CROSS_CHAIN_ANALYSIS'],
        secondaryCapabilities: ['autonomous_execution', 'multi_agent_coordination', 'risk_aware_planning'],
        dataRequirements: ['protocols', 'tokens', 'chains', 'market_data', 'user_context'],
        complexity: 'high',
        realTimeData: true,
        executionCapable: true
      }
    };
  }

  async analyzeSemanticIntent(
    query: string, 
    context?: {
      conversationHistory?: string[];
      userProfile?: UserProfile;
      marketConditions?: any;
    }
  ): Promise<SemanticIntent> {
    try {
      const systemPrompt = `
You are an expert DeFi semantic analyst that understands user intents with high precision and nuance.

Analyze the user's query semantically, considering:

PRIMARY INTENT PATTERNS:
- YIELD_OPTIMIZATION: "maximize returns", "best APY", "farming opportunities", "highest yield", "optimize earnings"
- RISK_ASSESSMENT: "safety", "liquidation risk", "portfolio health", "dangerous", "secure", "risk analysis"
- GOVERNANCE_PARTICIPATION: "voting", "proposals", "governance tokens", "DAO", "delegate", "participate"
- PORTFOLIO_ANALYSIS: "my holdings", "performance", "current positions", "portfolio review", "analyze my"
- MARKET_INTELLIGENCE: "market conditions", "trends", "price movements", "market overview", "what's happening"
- CROSS_CHAIN_ANALYSIS: "bridge", "multi-chain", "compare chains", "cross-chain", "different networks"
- ARBITRAGE_DETECTION: "price differences", "arbitrage", "profit opportunities", "price gaps", "exploit"
- LIQUIDITY_MANAGEMENT: "provide liquidity", "LP tokens", "liquidity pools", "remove liquidity"
- EMERGENCY_ACTION: "urgent", "emergency", "liquidation", "immediate", "help", "crisis"

SECONDARY MODIFIERS:
- Urgency: "urgent", "immediately", "ASAP", "emergency", "quick" = high; "soon", "today" = medium; default = low
- Risk Tolerance: "safe", "conservative", "low risk" = low; "moderate", "balanced" = medium; "aggressive", "high risk" = high
- Time Horizon: "quick", "short-term", "immediate" = short; "medium-term", "few months" = medium; "long-term", "hold" = long
- Complexity: Simple queries = 1-3, Multi-step = 4-6, Complex strategies = 7-10

IMPLICIT NEEDS DETECTION:
- If asking about yields → might need risk analysis
- If mentioning specific amounts → might need optimal sizing
- If comparing options → might need comprehensive analysis
- If showing concern → might need risk assessment
- If mentioning losses → might need emergency action

Context: ${JSON.stringify(context || {})}

Respond with detailed semantic analysis in JSON format:
{
  "primary": {
    "type": "INTENT_TYPE",
    "confidence": 0.95,
    "semanticScore": 0.92,
    "reasoning": "Detailed explanation of why this intent was selected"
  },
  "secondary": {
    "urgency": "low|medium|high|critical",
    "riskTolerance": "low|medium|high", 
    "timeHorizon": "short|medium|long",
    "complexity": 5
  },
  "entities": {
    "tokens": ["ETH", "USDC"],
    "protocols": ["Aave", "Uniswap"],
    "chains": ["ethereum", "polygon"],
    "amounts": ["$1000", "50%"],
    "confidence": 0.88
  },
  "context": {
    "implicitNeeds": ["risk_analysis", "gas_optimization"]
  }
}
`;

      const userPrompt = `
Analyze this DeFi query semantically:

User Query: "${query}"

Consider:
1. What is the user's primary goal or intent?
2. What secondary factors (urgency, risk tolerance, time horizon) are implied?
3. What specific entities (tokens, protocols, chains, amounts) are mentioned?
4. What implicit needs might the user have that they didn't explicitly mention?
5. How complex is this request (1-10 scale)?

Provide detailed semantic analysis with high confidence scores for clear intents and lower scores for ambiguous queries.
`;

      const analysis = await this.mistral.chatCompleteJSON<SemanticIntent>({
        system: systemPrompt,
        user: userPrompt,
        temperature: 0.1,
        maxTokens: 800,
      });

      // Validate and enhance the analysis
      const enhancedAnalysis = this.enhanceSemanticAnalysis(analysis, query, context);

      logger.info('Semantic intent analysis completed', {
        query,
        primaryIntent: enhancedAnalysis.primary.type,
        confidence: enhancedAnalysis.primary.confidence,
        complexity: enhancedAnalysis.secondary.complexity,
        entitiesFound: Object.values(enhancedAnalysis.entities).flat().length,
      });

      return enhancedAnalysis;
    } catch (error) {
      logger.error('Failed to analyze semantic intent', { query, error });
      
      // Return fallback analysis
      return this.createFallbackIntent(query);
    }
  }

  private enhanceSemanticAnalysis(
    analysis: SemanticIntent, 
    query: string, 
    context?: any
  ): SemanticIntent {
    // Enhance with additional context and validation
    const enhanced = { ...analysis };

    // Add conversation context if available
    if (context?.conversationHistory) {
      enhanced.context.conversationHistory = context.conversationHistory;
    }

    // Add user profile context
    if (context?.userProfile) {
      enhanced.context.userProfile = context.userProfile;
      
      // Adjust risk tolerance based on user profile
      if (context.userProfile.riskTolerance && enhanced.secondary.riskTolerance === 'medium') {
        enhanced.secondary.riskTolerance = context.userProfile.riskTolerance;
      }
    }

    // Detect additional implicit needs based on query patterns
    const additionalNeeds = this.detectImplicitNeeds(query, enhanced.primary.type);
    enhanced.context.implicitNeeds = [
      ...(enhanced.context.implicitNeeds || []),
      ...additionalNeeds
    ];

    // Adjust confidence based on entity extraction quality
    if (enhanced.entities.confidence < 0.5 && enhanced.primary.confidence > 0.8) {
      enhanced.primary.confidence = Math.max(0.6, enhanced.primary.confidence - 0.2);
    }

    return enhanced;
  }

  private detectImplicitNeeds(query: string, primaryIntent: IntentType): string[] {
    const implicitNeeds: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Pattern-based implicit need detection
    if (primaryIntent === 'YIELD_OPTIMIZATION') {
      if (lowerQuery.includes('safe') || lowerQuery.includes('secure')) {
        implicitNeeds.push('risk_analysis');
      }
      if (lowerQuery.includes('gas') || lowerQuery.includes('fee')) {
        implicitNeeds.push('gas_optimization');
      }
      if (lowerQuery.includes('chain') || lowerQuery.includes('network')) {
        implicitNeeds.push('cross_chain_analysis');
      }
    }

    if (primaryIntent === 'PORTFOLIO_ANALYSIS') {
      implicitNeeds.push('risk_assessment', 'yield_optimization');
    }

    if (lowerQuery.includes('best') || lowerQuery.includes('compare')) {
      implicitNeeds.push('comprehensive_analysis');
    }

    if (lowerQuery.includes('urgent') || lowerQuery.includes('emergency')) {
      implicitNeeds.push('immediate_action');
    }

    return [...new Set(implicitNeeds)]; // Remove duplicates
  }

  private createFallbackIntent(query: string): SemanticIntent {
    // Simple keyword-based fallback
    const lowerQuery = query.toLowerCase();
    let primaryType: IntentType = 'MARKET_INTELLIGENCE'; // Default fallback

    if (lowerQuery.includes('yield') || lowerQuery.includes('apy') || lowerQuery.includes('farm')) {
      primaryType = 'YIELD_OPTIMIZATION';
    } else if (lowerQuery.includes('risk') || lowerQuery.includes('safe') || lowerQuery.includes('liquidat')) {
      primaryType = 'RISK_ASSESSMENT';
    } else if (lowerQuery.includes('governance') || lowerQuery.includes('vote') || lowerQuery.includes('proposal')) {
      primaryType = 'GOVERNANCE_PARTICIPATION';
    } else if (lowerQuery.includes('portfolio') || lowerQuery.includes('my') || lowerQuery.includes('position')) {
      primaryType = 'PORTFOLIO_ANALYSIS';
    }

    return {
      primary: {
        type: primaryType,
        confidence: 0.3,
        semanticScore: 0.2,
        reasoning: 'Fallback analysis due to semantic analysis failure'
      },
      secondary: {
        urgency: 'low',
        riskTolerance: 'medium',
        timeHorizon: 'medium',
        complexity: 3
      },
      entities: {
        tokens: [],
        protocols: [],
        chains: [],
        amounts: [],
        confidence: 0.1
      },
      context: {
        implicitNeeds: []
      }
    };
  }

  async routeToAgents(semanticIntent: SemanticIntent): Promise<AgentRoutingPlan> {
    try {
      logger.info('Creating agent routing plan', {
        primaryIntent: semanticIntent.primary.type,
        confidence: semanticIntent.primary.confidence,
        complexity: semanticIntent.secondary.complexity,
      });

      // Find candidate agents based on intent
      const candidateAgents = this.findCandidateAgents(semanticIntent);
      
      // Select primary agent
      const primaryAgent = this.selectPrimaryAgent(candidateAgents, semanticIntent);
      
      // Determine supporting agents
      const supportingAgents = this.selectSupportingAgents(semanticIntent, primaryAgent.name);
      
      // Create execution strategy
      const executionOrder = this.determineExecutionOrder(primaryAgent, supportingAgents, semanticIntent);
      
      // Determine coordination strategy
      const coordinationStrategy = this.determineCoordinationStrategy(semanticIntent);
      
      // Create fallback plan
      const fallbackPlan = this.createFallbackPlan(candidateAgents, primaryAgent.name);

      const routingPlan: AgentRoutingPlan = {
        primaryAgent,
        supportingAgents,
        executionOrder,
        coordinationStrategy,
        fallbackPlan
      };

      logger.info('Agent routing plan created', {
        primaryAgent: primaryAgent.name,
        supportingAgentCount: supportingAgents.length,
        coordinationStrategy,
        executionOrder,
      });

      return routingPlan;
    } catch (error) {
      logger.error('Failed to create agent routing plan', { semanticIntent, error });
      
      // Return fallback routing plan
      return this.createFallbackRoutingPlan(semanticIntent);
    }
  }

  private findCandidateAgents(semanticIntent: SemanticIntent): Array<{name: string, score: number}> {
    const candidates: Array<{name: string, score: number}> = [];

    for (const [agentName, capability] of Object.entries(this.agentCapabilities)) {
      let score = 0;

      // Primary intent match
      if (capability.primaryIntents.includes(semanticIntent.primary.type)) {
        score += 10;
      }

      // Secondary capability match
      for (const implicitNeed of semanticIntent.context.implicitNeeds) {
        if (capability.secondaryCapabilities.some(cap => 
          cap.toLowerCase().includes(implicitNeed.toLowerCase()) ||
          implicitNeed.toLowerCase().includes(cap.toLowerCase())
        )) {
          score += 3;
        }
      }

      // Data requirement match
      const hasRequiredData = capability.dataRequirements.every(req => {
        if (req === 'tokens') return semanticIntent.entities.tokens.length > 0;
        if (req === 'protocols') return semanticIntent.entities.protocols.length > 0;
        if (req === 'chains') return semanticIntent.entities.chains.length > 0;
        return true; // Assume other requirements are available
      });

      if (hasRequiredData) score += 2;

      // Complexity match
      const complexityMatch = this.getComplexityScore(capability.complexity, semanticIntent.secondary.complexity);
      score += complexityMatch;

      // Real-time data requirement
      if (semanticIntent.secondary.urgency === 'high' && capability.realTimeData) {
        score += 2;
      }

      if (score > 0) {
        candidates.push({ name: agentName, score });
      }
    }

    return candidates.sort((a, b) => b.score - a.score);
  }

  private getComplexityScore(agentComplexity: 'low' | 'medium' | 'high', queryComplexity: number): number {
    const complexityMap: Record<'low' | 'medium' | 'high', number> = { low: 3, medium: 6, high: 9 };
    const agentLevel = complexityMap[agentComplexity];
    
    // Perfect match gets highest score
    if (Math.abs(agentLevel - queryComplexity) <= 1) return 3;
    if (Math.abs(agentLevel - queryComplexity) <= 3) return 1;
    return 0;
  }

  private selectPrimaryAgent(
    candidates: Array<{name: string, score: number}>, 
    semanticIntent: SemanticIntent
  ): { name: string; confidence: number; reasoning: string } {
    if (candidates.length === 0) {
      return {
        name: 'AgenticYieldAgent', // Default fallback
        confidence: 0.3,
        reasoning: 'No suitable agents found, using default agentic agent'
      };
    }

    const topCandidate = candidates[0];
    const confidence = Math.min(0.95, (topCandidate.score / 15) * semanticIntent.primary.confidence);
    
    return {
      name: topCandidate.name,
      confidence,
      reasoning: `Selected based on intent match (${semanticIntent.primary.type}) and capability score (${topCandidate.score})`
    };
  }

  private selectSupportingAgents(
    semanticIntent: SemanticIntent, 
    primaryAgentName: string
  ): Array<{ name: string; role: 'validation' | 'data_provider' | 'risk_checker' | 'executor'; confidence: number }> {
    const supportingAgents: Array<{ name: string; role: 'validation' | 'data_provider' | 'risk_checker' | 'executor'; confidence: number }> = [];

    // Add risk checker for high-risk or high-value operations
    if (semanticIntent.secondary.riskTolerance === 'low' || 
        semanticIntent.entities.amounts.some(amt => amt.includes('$') && parseInt(amt.replace(/\D/g, '')) > 10000)) {
      if (primaryAgentName !== 'RiskAgent') {
        supportingAgents.push({
          name: 'RiskAgent',
          role: 'risk_checker',
          confidence: 0.8
        });
      }
    }

    // Add governance agent for token-related queries
    if (semanticIntent.entities.tokens.length > 0 && 
        semanticIntent.context.implicitNeeds.includes('governance_opportunities')) {
      if (primaryAgentName !== 'GovernanceAgent') {
        supportingAgents.push({
          name: 'GovernanceAgent',
          role: 'data_provider',
          confidence: 0.7
        });
      }
    }

    // Add enhanced yield agent for complex yield optimization
    if (semanticIntent.primary.type === 'YIELD_OPTIMIZATION' && 
        semanticIntent.secondary.complexity > 6 &&
        primaryAgentName !== 'EnhancedYieldAgent') {
      supportingAgents.push({
        name: 'EnhancedYieldAgent',
        role: 'validation',
        confidence: 0.85
      });
    }

    return supportingAgents;
  }

  private determineExecutionOrder(
    primaryAgent: { name: string; confidence: number; reasoning: string },
    supportingAgents: Array<{ name: string; role: string; confidence: number }>,
    semanticIntent: SemanticIntent
  ): string[] {
    const order: string[] = [];

    // Data providers go first
    const dataProviders = supportingAgents.filter(agent => agent.role === 'data_provider');
    order.push(...dataProviders.map(agent => agent.name));

    // Primary agent
    order.push(primaryAgent.name);

    // Validators and risk checkers
    const validators = supportingAgents.filter(agent => 
      agent.role === 'validation' || agent.role === 'risk_checker'
    );
    order.push(...validators.map(agent => agent.name));

    // Executors last (if any)
    const executors = supportingAgents.filter(agent => agent.role === 'executor');
    order.push(...executors.map(agent => agent.name));

    return order;
  }

  private determineCoordinationStrategy(semanticIntent: SemanticIntent): 'sequential' | 'parallel' | 'conditional' {
    // High urgency or emergency actions need sequential processing
    if (semanticIntent.secondary.urgency === 'critical' || semanticIntent.primary.type === 'EMERGENCY_ACTION') {
      return 'sequential';
    }

    // Complex queries with multiple implicit needs can be processed in parallel
    if (semanticIntent.secondary.complexity > 7 && semanticIntent.context.implicitNeeds.length > 2) {
      return 'parallel';
    }

    // Risk-sensitive operations need conditional processing
    if (semanticIntent.secondary.riskTolerance === 'low' || 
        semanticIntent.context.implicitNeeds.includes('risk_analysis')) {
      return 'conditional';
    }

    return 'sequential'; // Default safe option
  }

  private createFallbackPlan(
    candidates: Array<{name: string, score: number}>, 
    primaryAgentName: string
  ): string[] {
    const fallback = candidates
      .filter(candidate => candidate.name !== primaryAgentName)
      .slice(0, 2) // Top 2 alternatives
      .map(candidate => candidate.name);

    // Always include AgenticYieldAgent as ultimate fallback
    if (!fallback.includes('AgenticYieldAgent') && primaryAgentName !== 'AgenticYieldAgent') {
      fallback.push('AgenticYieldAgent');
    }

    return fallback;
  }

  private createFallbackRoutingPlan(semanticIntent: SemanticIntent): AgentRoutingPlan {
    return {
      primaryAgent: {
        name: 'AgenticYieldAgent',
        confidence: 0.5,
        reasoning: 'Fallback routing due to analysis failure'
      },
      supportingAgents: [],
      executionOrder: ['AgenticYieldAgent'],
      coordinationStrategy: 'sequential',
      fallbackPlan: ['YieldAgent', 'RiskAgent']
    };
  }
}

export default SemanticRouterService;
