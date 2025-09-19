import { logger } from '@/utils/logger';
import { cache } from '@/utils/cache';
import { PRICE_FEED_IDS } from '@/config';
import EnhancedPythService, { 
  YieldCalculationResult, 
  ArbitrageOpportunity 
} from '@/services/EnhancedPythService';
import { 
  YieldOpportunity, 
  CrossChainComparison, 
  AgentTask 
} from '@/types';

export interface EnhancedYieldOpportunity extends YieldOpportunity {
  confidence: number;
  priceImpact: number;
  optimalTradeSize: string;
  arbitrageOpportunities?: ArbitrageOpportunity[];
}

export interface PythYieldAnalysis {
  opportunities: EnhancedYieldOpportunity[];
  crossChainArbitrage: ArbitrageOpportunity[];
  marketConfidence: number;
  riskAssessment: {
    overall: string;
    factors: string[];
    recommendations: string[];
  };
}

export class EnhancedYieldAgent {
  private pythService: EnhancedPythService;

  constructor() {
    this.pythService = new EnhancedPythService();
  }

  async execute(task: AgentTask): Promise<any> {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (task.action) {
        case 'findOptimalYields':
          result = await this.findOptimalYields(task.parameters);
          break;
        case 'analyzeYieldWithConfidence':
          result = await this.analyzeYieldWithConfidence(task.parameters as any);
          break;
        case 'detectArbitrageOpportunities':
          result = await this.detectArbitrageOpportunities(task.parameters as any);
          break;
        case 'getComprehensiveYieldAnalysis':
          result = await this.getComprehensiveYieldAnalysis(task.parameters as any);
          break;
        case 'optimizePortfolioYield':
          result = await this.optimizePortfolioYield(task.parameters as any);
          break;
        default:
          throw new Error(`Unknown action: ${task.action}`);
      }
      
      const executionTime = Date.now() - startTime;
      
      logger.info('Enhanced Yield agent task completed', {
        action: task.action,
        executionTime,
        resultType: typeof result,
      });
      
      return result;
    } catch (error: any) {
      logger.error('Enhanced Yield agent task failed', {
        action: task.action,
        parameters: task.parameters,
        error: error?.message || 'Unknown error',
      });
      throw error;
    }
  }

  // INNOVATION 1: Optimal Yields with Pyth Confidence Scoring
  async findOptimalYields(params: {
    tokens?: string[];
    chains?: number[];
    amount?: string;
    riskTolerance?: 'low' | 'medium' | 'high';
    minConfidence?: number;
  }): Promise<EnhancedYieldOpportunity[]> {
    try {
      const {
        tokens = ['ETH', 'USDC', 'USDT', 'DAI'],
        chains = [1, 137], // Ethereum, Polygon
        amount = '1000',
        riskTolerance = 'medium',
        minConfidence = 70
      } = params;

      const cacheKey = `enhanced-yield:optimal:${JSON.stringify(params)}`;
      const cached = await cache.get<EnhancedYieldOpportunity[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const opportunities: EnhancedYieldOpportunity[] = [];
      
      // Get real-time prices with confidence for all tokens
      const priceData = await this.pythService.getMultipleTokenPrices(tokens, chains[0]);
      
      for (const token of tokens) {
        const tokenPriceData = priceData.get(token);
        
        if (!tokenPriceData || tokenPriceData.confidence < minConfidence) {
          logger.warn('Skipping token due to low confidence', { 
            token, 
            confidence: tokenPriceData?.confidence || 0 
          });
          continue;
        }

        for (const chainId of chains) {
          // Mock pool data - in real implementation, you'd get this from The Graph or other sources
          const mockPoolData = this.generateMockPoolData(token, chainId);
          
          for (const pool of mockPoolData) {
            try {
              // Calculate yield with Pyth confidence
              const yieldResult = await this.pythService.calculateYieldWithConfidence(
                this.getTokenPriceId(token),
                this.getTokenPriceId('USD'), // Base quote
                pool.liquidity,
                pool.volume24h,
                chainId
              );
              
              // Only include opportunities that meet confidence threshold
              if (yieldResult.confidence >= minConfidence) {
                const opportunity: EnhancedYieldOpportunity = {
                  protocol: pool.protocol,
                  chainId,
                  tokenAddress: pool.address,
                  tokenSymbol: token,
                  apy: yieldResult.estimatedAPY.toString(),
                  tvl: pool.liquidity,
                  riskScore: yieldResult.riskScore,
                  category: pool.category,
                  confidence: yieldResult.confidence,
                  priceImpact: yieldResult.priceImpact,
                  optimalTradeSize: yieldResult.optimalTradeSize,
                  metadata: {
                    pythConfidence: yieldResult.confidence,
                    priceImpact: yieldResult.priceImpact,
                    optimalSize: yieldResult.optimalTradeSize,
                    currentPrice: tokenPriceData.price,
                    lastUpdate: new Date().toISOString()
                  }
                };
                
                opportunities.push(opportunity);
              }
            } catch (yieldError: any) {
              logger.warn('Failed to calculate yield for pool', { 
                token, 
                chainId, 
                pool: pool.protocol, 
                error: yieldError?.message 
              });
            }
          }
        }
      }
      
      // Filter by risk tolerance
      const filteredOpportunities = this.filterByRiskTolerance(opportunities, riskTolerance);
      
      // Sort by a composite score (APY * confidence / risk)
      const scoredOpportunities = filteredOpportunities.map(opp => ({
        ...opp,
        compositeScore: (parseFloat(opp.apy) * opp.confidence) / (opp.riskScore * 10)
      })).sort((a, b) => b.compositeScore - a.compositeScore);
      
      // Take top 20 opportunities
      const topOpportunities = scoredOpportunities.slice(0, 20);
      
      // Cache for 5 minutes
      await cache.set(cacheKey, topOpportunities, 300);

      logger.info('Found optimal yield opportunities with Pyth confidence', {
        totalFound: opportunities.length,
        afterFiltering: filteredOpportunities.length,
        topCount: topOpportunities.length,
        avgConfidence: topOpportunities.reduce((sum, opp) => sum + opp.confidence, 0) / topOpportunities.length
      });

      return topOpportunities;
    } catch (error: any) {
      logger.error('Failed to find optimal yields', { params, error: error?.message });
      return [];
    }
  }

  // INNOVATION 2: Yield Analysis with Real-time Confidence
  async analyzeYieldWithConfidence(params: {
    baseToken: string;
    quoteToken: string;
    poolLiquidity: string;
    volume24h: string;
    chainId?: number;
  }): Promise<YieldCalculationResult & { analysis: string; recommendations: string[] }> {
    try {
      const { baseToken, quoteToken, poolLiquidity, volume24h, chainId = 1 } = params;
      
      const baseTokenId = this.getTokenPriceId(baseToken);
      const quoteTokenId = this.getTokenPriceId(quoteToken);
      
      if (!baseTokenId || !quoteTokenId) {
        throw new Error(`Price feed not available for ${baseToken}/${quoteToken}`);
      }
      
      // Get yield calculation with confidence
      const yieldResult = await this.pythService.calculateYieldWithConfidence(
        baseTokenId,
        quoteTokenId,
        poolLiquidity,
        volume24h,
        chainId
      );
      
      // Generate analysis and recommendations
      const analysis = this.generateYieldAnalysis(yieldResult, baseToken, quoteToken);
      const recommendations = this.generateYieldRecommendations(yieldResult, baseToken);
      
      logger.info('Analyzed yield with confidence', {
        baseToken,
        quoteToken,
        chainId,
        apy: yieldResult.estimatedAPY,
        confidence: yieldResult.confidence,
        riskScore: yieldResult.riskScore
      });
      
      return {
        ...yieldResult,
        analysis,
        recommendations
      };
      
    } catch (error: any) {
      logger.error('Failed to analyze yield with confidence', { params, error: error?.message });
      throw error;
    }
  }

  // INNOVATION 3: Cross-Chain Arbitrage Detection
  async detectArbitrageOpportunities(params: {
    tokens: string[];
    chains?: number[];
    minProfitBps?: number;
  }): Promise<ArbitrageOpportunity[]> {
    try {
      const { 
        tokens, 
        chains = [1, 137], // Ethereum, Polygon
        minProfitBps = 50 // 0.5% minimum profit
      } = params;
      
      const cacheKey = `arbitrage:${tokens.join(',')}:${chains.join(',')}`;
      const cached = await cache.get<ArbitrageOpportunity[]>(cacheKey);
      
      if (cached) {
        return cached;
      }
      
      const tokenPriceIds = tokens
        .map(token => this.getTokenPriceId(token))
        .filter((id): id is string => id !== null);
      
      const chainConfigs = chains.map(chainId => ({ chainId }));
      
      const opportunities = await this.pythService.detectCrossChainArbitrage(
        tokenPriceIds,
        chainConfigs
      );
      
      // Filter by minimum profit
      const profitableOpportunities = opportunities.filter(
        opp => opp.profitPotential * 100 >= minProfitBps
      );
      
      // Add execution strategies
      const enhancedOpportunities = profitableOpportunities.map(opp => ({
        ...opp,
        executionStrategy: this.generateArbitrageStrategy(opp),
        estimatedGasCost: this.estimateArbitrageGasCost(opp.sourceChain, opp.targetChain),
        timeToExecution: this.estimateExecutionTime(opp.sourceChain, opp.targetChain)
      }));
      
      // Cache for 2 minutes (arbitrage opportunities are time-sensitive)
      await cache.set(cacheKey, enhancedOpportunities, 120);
      
      logger.info('Detected cross-chain arbitrage opportunities', {
        tokens,
        chains,
        totalOpportunities: opportunities.length,
        profitableOpportunities: profitableOpportunities.length,
        avgProfit: profitableOpportunities.reduce((sum, opp) => sum + opp.profitPotential, 0) / profitableOpportunities.length
      });
      
      return enhancedOpportunities;
      
    } catch (error: any) {
      logger.error('Failed to detect arbitrage opportunities', { params, error: error?.message });
      return [];
    }
  }

  // INNOVATION 4: Comprehensive Yield Analysis
  async getComprehensiveYieldAnalysis(params: {
    tokens?: string[];
    chains?: number[];
    amount?: string;
  }): Promise<PythYieldAnalysis> {
    try {
      const { 
        tokens = ['ETH', 'USDC', 'USDT', 'DAI'],
        chains = [1, 137],
        amount = '10000'
      } = params;
      
      // Get optimal yields
      const opportunities = await this.findOptimalYields({
        tokens,
        chains,
        amount,
        riskTolerance: 'medium'
      });
      
      // Get arbitrage opportunities
      const arbitrageOpportunities = await this.detectArbitrageOpportunities({
        tokens,
        chains,
        minProfitBps: 25 // 0.25% minimum for comprehensive analysis
      });
      
      // Calculate market confidence
      const marketConfidence = opportunities.length > 0 
        ? opportunities.reduce((sum, opp) => sum + opp.confidence, 0) / opportunities.length
        : 0;
      
      // Generate risk assessment
      const riskAssessment = this.generateRiskAssessment(opportunities, arbitrageOpportunities, marketConfidence);
      
      const analysis: PythYieldAnalysis = {
        opportunities,
        crossChainArbitrage: arbitrageOpportunities,
        marketConfidence,
        riskAssessment
      };
      
      logger.info('Generated comprehensive yield analysis', {
        opportunityCount: opportunities.length,
        arbitrageCount: arbitrageOpportunities.length,
        marketConfidence,
        avgAPY: opportunities.reduce((sum, opp) => sum + parseFloat(opp.apy), 0) / opportunities.length
      });
      
      return analysis;
      
    } catch (error: any) {
      logger.error('Failed to generate comprehensive yield analysis', { params, error: error?.message });
      throw error;
    }
  }

  // INNOVATION 5: Portfolio Yield Optimization
  async optimizePortfolioYield(params: {
    currentPositions: Array<{
      token: string;
      amount: string;
      currentAPY: number;
      chainId: number;
    }>;
    riskTolerance: 'low' | 'medium' | 'high';
    targetAPY?: number;
  }): Promise<{
    currentYield: number;
    optimizedYield: number;
    rebalanceRecommendations: Array<{
      action: 'move' | 'add' | 'remove';
      from?: { token: string; chainId: number; protocol: string };
      to: { token: string; chainId: number; protocol: string };
      amount: string;
      expectedGain: number;
      confidence: number;
    }>;
    riskAnalysis: string;
  }> {
    try {
      const { currentPositions, riskTolerance, targetAPY } = params;
      
      // Calculate current portfolio yield
      const totalValue = currentPositions.reduce((sum, pos) => sum + parseFloat(pos.amount), 0);
      const currentYield = currentPositions.reduce((sum, pos) => {
        const weight = parseFloat(pos.amount) / totalValue;
        return sum + (pos.currentAPY * weight);
      }, 0);
      
      // Get optimal opportunities for each token
      const tokens = [...new Set(currentPositions.map(pos => pos.token))];
      const chains = [...new Set(currentPositions.map(pos => pos.chainId))];
      
      const optimalOpportunities = await this.findOptimalYields({
        tokens,
        chains,
        riskTolerance,
        minConfidence: 75
      });
      
      // Generate rebalance recommendations
      const rebalanceRecommendations = [];
      let optimizedYield = currentYield;
      
      for (const position of currentPositions) {
        const betterOpportunities = optimalOpportunities.filter(opp => 
          opp.tokenSymbol === position.token &&
          parseFloat(opp.apy) > position.currentAPY &&
          opp.confidence > 75
        );
        
        if (betterOpportunities.length > 0) {
          const bestOpportunity = betterOpportunities[0];
          const expectedGain = parseFloat(bestOpportunity.apy) - position.currentAPY;
          
          rebalanceRecommendations.push({
            action: 'move' as const,
            from: {
              token: position.token,
              chainId: position.chainId,
              protocol: 'current' // Would be actual protocol in real implementation
            },
            to: {
              token: bestOpportunity.tokenSymbol,
              chainId: bestOpportunity.chainId,
              protocol: bestOpportunity.protocol
            },
            amount: position.amount,
            expectedGain,
            confidence: bestOpportunity.confidence
          });
          
          // Update optimized yield calculation
          const weight = parseFloat(position.amount) / totalValue;
          optimizedYield += expectedGain * weight;
        }
      }
      
      // Generate risk analysis
      const avgConfidence = rebalanceRecommendations.length > 0
        ? rebalanceRecommendations.reduce((sum, rec) => sum + rec.confidence, 0) / rebalanceRecommendations.length
        : 0;
      
      const riskAnalysis = this.generatePortfolioRiskAnalysis(
        currentYield,
        optimizedYield,
        avgConfidence,
        riskTolerance
      );
      
      logger.info('Generated portfolio optimization recommendations', {
        currentYield,
        optimizedYield,
        improvementPotential: optimizedYield - currentYield,
        recommendationCount: rebalanceRecommendations.length,
        avgConfidence
      });
      
      return {
        currentYield,
        optimizedYield,
        rebalanceRecommendations,
        riskAnalysis
      };
      
    } catch (error: any) {
      logger.error('Failed to optimize portfolio yield', { params, error: error?.message });
      throw error;
    }
  }

  // Helper methods
  private getTokenPriceId(symbol: string): string {
    const priceIdMap: Record<string, string> = {
      'ETH': PRICE_FEED_IDS['ETH/USD'],
      'BTC': PRICE_FEED_IDS['BTC/USD'],
      'MATIC': PRICE_FEED_IDS['MATIC/USD'],
      'USDC': PRICE_FEED_IDS['USDC/USD'],
      'USDT': PRICE_FEED_IDS['USDT/USD'],
      'DAI': PRICE_FEED_IDS['DAI/USD'],
      'USD': PRICE_FEED_IDS['USDC/USD'] // Use USDC as USD proxy
    };
    
    return priceIdMap[symbol.toUpperCase()] || PRICE_FEED_IDS['ETH/USD'];
  }

  private generateMockPoolData(token: string, chainId: number): Array<{
    protocol: string;
    address: string;
    liquidity: string;
    volume24h: string;
    category: 'lending' | 'liquidity_pool' | 'staking';
  }> {
    // Mock data - in real implementation, this would come from The Graph or other sources
    const baseMultiplier = chainId === 1 ? 1 : 0.1; // Ethereum has higher liquidity
    
    return [
      {
        protocol: 'Aave',
        address: `0x${Math.random().toString(16).substr(2, 40)}`,
        liquidity: (Math.random() * 10000000 * baseMultiplier).toString(),
        volume24h: (Math.random() * 1000000 * baseMultiplier).toString(),
        category: 'lending' as const
      },
      {
        protocol: 'Compound',
        address: `0x${Math.random().toString(16).substr(2, 40)}`,
        liquidity: (Math.random() * 5000000 * baseMultiplier).toString(),
        volume24h: (Math.random() * 500000 * baseMultiplier).toString(),
        category: 'lending' as const
      },
      {
        protocol: 'Uniswap V3',
        address: `0x${Math.random().toString(16).substr(2, 40)}`,
        liquidity: (Math.random() * 20000000 * baseMultiplier).toString(),
        volume24h: (Math.random() * 2000000 * baseMultiplier).toString(),
        category: 'liquidity_pool' as const
      }
    ];
  }

  private filterByRiskTolerance(
    opportunities: EnhancedYieldOpportunity[],
    riskTolerance: 'low' | 'medium' | 'high'
  ): EnhancedYieldOpportunity[] {
    const riskThresholds = {
      low: 3,
      medium: 6,
      high: 10,
    };
    
    const maxRisk = riskThresholds[riskTolerance];
    return opportunities.filter(opp => opp.riskScore <= maxRisk);
  }

  private generateYieldAnalysis(
    yieldResult: YieldCalculationResult,
    baseToken: string,
    quoteToken: string
  ): string {
    const confidenceLevel = yieldResult.confidence > 80 ? 'high' : 
                           yieldResult.confidence > 60 ? 'medium' : 'low';
    
    return `${baseToken}/${quoteToken} yield analysis: ${yieldResult.estimatedAPY.toFixed(2)}% APY with ${confidenceLevel} confidence (${yieldResult.confidence.toFixed(1)}%). Price impact of ${yieldResult.priceImpact.toFixed(2)}% suggests optimal position size of ${yieldResult.optimalTradeSize}. Risk score: ${yieldResult.riskScore}/10.`;
  }

  private generateYieldRecommendations(
    yieldResult: YieldCalculationResult,
    token: string
  ): string[] {
    const recommendations = [];
    
    if (yieldResult.confidence < 70) {
      recommendations.push(`Consider waiting for higher price confidence before entering ${token} position`);
    }
    
    if (yieldResult.priceImpact > 2) {
      recommendations.push(`Split large orders to minimize price impact - optimal size is ${yieldResult.optimalTradeSize}`);
    }
    
    if (yieldResult.riskScore > 7) {
      recommendations.push(`High risk detected - consider diversifying across multiple protocols`);
    }
    
    if (yieldResult.estimatedAPY > 50) {
      recommendations.push(`Exceptionally high APY detected - verify protocol security and sustainability`);
    }
    
    return recommendations;
  }

  private generateArbitrageStrategy(opportunity: ArbitrageOpportunity): string {
    const sourceChainName = this.getChainName(opportunity.sourceChain);
    const targetChainName = this.getChainName(opportunity.targetChain);
    
    return `Buy on ${sourceChainName}, bridge to ${targetChainName}, sell for ${opportunity.profitPotential.toFixed(2)}% profit. Confidence: ${opportunity.confidence.toFixed(1)}%`;
  }

  private estimateArbitrageGasCost(sourceChain: number, targetChain: number): string {
    const gasCosts: Record<number, number> = {
      1: 50, // Ethereum - high gas
      137: 1, // Polygon - low gas
      30: 5, // Rootstock - medium gas
    };
    
    const sourceCost = gasCosts[sourceChain] || 10;
    const targetCost = gasCosts[targetChain] || 10;
    const bridgeCost = 5; // Bridge cost
    
    return (sourceCost + targetCost + bridgeCost).toString();
  }

  private estimateExecutionTime(sourceChain: number, targetChain: number): string {
    // Simplified execution time estimation
    const bridgeTimes: Record<string, string> = {
      '1-137': '10-15 minutes',
      '137-1': '10-15 minutes',
      '1-30': '20-30 minutes',
      '30-1': '20-30 minutes',
      '137-30': '15-25 minutes',
      '30-137': '15-25 minutes'
    };
    
    const key = `${sourceChain}-${targetChain}`;
    return bridgeTimes[key] || '15-20 minutes';
  }

  private generateRiskAssessment(
    opportunities: EnhancedYieldOpportunity[],
    arbitrageOpportunities: ArbitrageOpportunity[],
    marketConfidence: number
  ): {
    overall: string;
    factors: string[];
    recommendations: string[];
  } {
    const avgRisk = opportunities.length > 0 
      ? opportunities.reduce((sum, opp) => sum + opp.riskScore, 0) / opportunities.length
      : 5;
    
    const overall = marketConfidence > 80 && avgRisk < 4 ? 'Low Risk' :
                   marketConfidence > 60 && avgRisk < 6 ? 'Medium Risk' : 'High Risk';
    
    const factors = [
      `Market confidence: ${marketConfidence.toFixed(1)}%`,
      `Average risk score: ${avgRisk.toFixed(1)}/10`,
      `${opportunities.length} yield opportunities identified`,
      `${arbitrageOpportunities.length} arbitrage opportunities available`
    ];
    
    const recommendations = [
      marketConfidence < 70 ? 'Monitor price confidence before large positions' : 'Price confidence is adequate',
      avgRisk > 6 ? 'Consider diversification to reduce risk' : 'Risk levels are manageable',
      arbitrageOpportunities.length > 0 ? 'Cross-chain arbitrage opportunities available' : 'Limited arbitrage opportunities'
    ];
    
    return { overall, factors, recommendations };
  }

  private generatePortfolioRiskAnalysis(
    currentYield: number,
    optimizedYield: number,
    avgConfidence: number,
    riskTolerance: string
  ): string {
    const improvement = optimizedYield - currentYield;
    const improvementPercent = (improvement / currentYield) * 100;
    
    return `Portfolio optimization shows ${improvement.toFixed(2)}% APY improvement (${improvementPercent.toFixed(1)}% increase). ` +
           `Average confidence in recommendations: ${avgConfidence.toFixed(1)}%. ` +
           `Risk tolerance: ${riskTolerance}. ` +
           `${improvement > 2 ? 'Significant improvement potential identified.' : 'Modest improvement available.'}`;
  }

  private getChainName(chainId: number): string {
    const chainNames: Record<number, string> = {
      1: 'Ethereum',
      137: 'Polygon',
      30: 'Rootstock'
    };
    
    return chainNames[chainId] || `Chain ${chainId}`;
  }
}

export default EnhancedYieldAgent;
