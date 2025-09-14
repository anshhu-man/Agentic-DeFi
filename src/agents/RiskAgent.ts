import { logger } from '@/utils/logger';
import { cache } from '@/utils/redis';
import AlchemyService from '@/services/AlchemyService';
import PythService from '@/services/PythService';
import { 
  RiskAnalysis, 
  TokenBalance, 
  DeFiPosition,
  AgentTask 
} from '@/types';

export class RiskAgent {
  private alchemyService: AlchemyService;
  private pythService: PythService;

  constructor(alchemyService: AlchemyService, pythService: PythService) {
    this.alchemyService = alchemyService;
    this.pythService = pythService;
  }

  async execute(task: AgentTask): Promise<any> {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (task.action) {
        case 'analyzePortfolioRisk':
          result = await this.analyzePortfolioRisk(task.parameters);
          break;
        case 'monitorLiquidationRisk':
          result = await this.monitorLiquidationRisk(task.parameters);
          break;
        case 'calculateImpermanentLoss':
          result = await this.calculateImpermanentLoss(task.parameters);
          break;
        case 'assessConcentrationRisk':
          result = await this.assessConcentrationRisk(task.parameters);
          break;
        default:
          throw new Error(`Unknown action: ${task.action}`);
      }
      
      const executionTime = Date.now() - startTime;
      
      logger.info('Risk agent task completed', {
        action: task.action,
        executionTime,
        resultType: typeof result,
      });
      
      return result;
    } catch (error) {
      logger.error('Risk agent task failed', {
        action: task.action,
        parameters: task.parameters,
        error,
      });
      throw error;
    }
  }

  async analyzePortfolioRisk(params: {
    userAddress?: string;
    chains?: string[];
    tokens?: string[];
    timeframe?: string;
  }): Promise<RiskAnalysis> {
    try {
      const { 
        userAddress = '0x0000000000000000000000000000000000000000',
        chains = ['ethereum', 'polygon'],
        tokens,
        timeframe = '24h'
      } = params;

      const cacheKey = `risk:analysis:${userAddress}:${JSON.stringify(params)}`;
      const cached = await cache.get<RiskAnalysis>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Get user's portfolio across chains
      const portfolioBalances = await this.alchemyService.getMultiChainBalances(userAddress);
      
      // Calculate overall risk metrics
      const liquidationRisk = await this.calculateLiquidationRisk(portfolioBalances);
      const impermanentLossRisk = await this.calculateImpermanentLossRisk(portfolioBalances);
      const concentrationRisk = await this.calculateConcentrationRisk(portfolioBalances);
      
      // Calculate overall risk score (1-10 scale)
      const overallRiskScore = this.calculateOverallRiskScore(
        liquidationRisk,
        impermanentLossRisk,
        concentrationRisk
      );
      
      // Generate recommendations
      const recommendations = this.generateRiskRecommendations(
        overallRiskScore,
        liquidationRisk,
        impermanentLossRisk,
        concentrationRisk
      );

      const riskAnalysis: RiskAnalysis = {
        overallRiskScore,
        liquidationRisk,
        impermanentLossRisk,
        concentrationRisk,
        recommendations,
      };

      // Cache for 5 minutes
      await cache.set(cacheKey, riskAnalysis, 300);

      logger.info('Completed portfolio risk analysis', {
        userAddress,
        overallRiskScore,
        recommendationCount: recommendations.length,
      });

      return riskAnalysis;
    } catch (error) {
      logger.error('Failed to analyze portfolio risk', { params, error });
      
      // Return default risk analysis
      return {
        overallRiskScore: 5,
        liquidationRisk: { positions: [] },
        impermanentLossRisk: { lpPositions: [] },
        concentrationRisk: { topHoldings: [] },
        recommendations: ['Unable to analyze portfolio risk at this time'],
      };
    }
  }

  async monitorLiquidationRisk(params: {
    userAddress: string;
    protocols?: string[];
    threshold?: number;
  }): Promise<Array<{
    protocol: string;
    position: string;
    healthFactor: string;
    liquidationPrice: string;
    timeToLiquidation?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>> {
    try {
      const { 
        userAddress,
        protocols = ['aave', 'compound'],
        threshold = 1.5 // Health factor threshold
      } = params;

      const liquidationRisks = [];

      // Mock implementation - would integrate with actual lending protocols
      // This would query user's borrowing positions from Aave, Compound, etc.
      
      const mockPositions = [
        {
          protocol: 'Aave',
          position: 'ETH/USDC',
          healthFactor: '1.8',
          liquidationPrice: '2800',
          timeToLiquidation: '2 days',
          severity: 'medium' as const,
        },
        {
          protocol: 'Compound',
          position: 'WBTC/DAI',
          healthFactor: '2.1',
          liquidationPrice: '45000',
          severity: 'low' as const,
        },
      ];

      // Filter by threshold and add severity assessment
      const filteredRisks = mockPositions
        .filter(pos => parseFloat(pos.healthFactor) < threshold * 1.5)
        .map(pos => ({
          ...pos,
          severity: this.assessLiquidationSeverity(parseFloat(pos.healthFactor)),
        }));

      logger.info('Monitored liquidation risks', {
        userAddress,
        totalPositions: mockPositions.length,
        atRiskPositions: filteredRisks.length,
      });

      return filteredRisks;
    } catch (error) {
      logger.error('Failed to monitor liquidation risk', { params, error });
      return [];
    }
  }

  async calculateImpermanentLoss(params: {
    lpPositions: Array<{
      protocol: string;
      pair: string;
      entryPrice0: string;
      entryPrice1: string;
      currentPrice0: string;
      currentPrice1: string;
      amount: string;
    }>;
  }): Promise<Array<{
    protocol: string;
    pair: string;
    currentIL: string;
    projectedIL: string;
    severity: 'low' | 'medium' | 'high';
  }>> {
    try {
      const { lpPositions } = params;
      const impermanentLossData = [];

      for (const position of lpPositions) {
        const currentIL = this.calculateCurrentIL(
          parseFloat(position.entryPrice0),
          parseFloat(position.entryPrice1),
          parseFloat(position.currentPrice0),
          parseFloat(position.currentPrice1)
        );

        // Project IL based on volatility
        const volatility0 = await this.pythService.calculateVolatility(
          position.pair.split('/')[0], 
          24
        );
        const volatility1 = await this.pythService.calculateVolatility(
          position.pair.split('/')[1], 
          24
        );

        const projectedIL = this.projectImpermanentLoss(currentIL, volatility0, volatility1);

        impermanentLossData.push({
          protocol: position.protocol,
          pair: position.pair,
          currentIL: `${currentIL.toFixed(2)}%`,
          projectedIL: `${projectedIL.toFixed(2)}%`,
          severity: this.assessILSeverity(currentIL),
        });
      }

      logger.info('Calculated impermanent loss', {
        positionCount: lpPositions.length,
        avgCurrentIL: impermanentLossData.reduce((sum, pos) => 
          sum + parseFloat(pos.currentIL), 0) / impermanentLossData.length,
      });

      return impermanentLossData;
    } catch (error) {
      logger.error('Failed to calculate impermanent loss', { params, error });
      return [];
    }
  }

  async assessConcentrationRisk(params: {
    portfolio: Map<number, TokenBalance[]>;
  }): Promise<{
    topHoldings: Array<{
      symbol: string;
      percentage: string;
      riskLevel: 'low' | 'medium' | 'high';
    }>;
    diversificationScore: number;
    recommendations: string[];
  }> {
    try {
      const { portfolio } = params;
      
      // Calculate total portfolio value
      let totalValue = 0;
      const holdings: Array<{ symbol: string; value: number }> = [];

      for (const [chainId, balances] of portfolio) {
        for (const balance of balances) {
          const value = parseFloat(balance.valueUSD);
          totalValue += value;
          
          const existingHolding = holdings.find(h => h.symbol === balance.symbol);
          if (existingHolding) {
            existingHolding.value += value;
          } else {
            holdings.push({ symbol: balance.symbol, value });
          }
        }
      }

      // Sort by value and calculate percentages
      holdings.sort((a, b) => b.value - a.value);
      
      const topHoldings = holdings.slice(0, 10).map(holding => ({
        symbol: holding.symbol,
        percentage: ((holding.value / totalValue) * 100).toFixed(2),
        riskLevel: this.assessHoldingRisk(holding.value / totalValue),
      }));

      // Calculate diversification score (0-10)
      const diversificationScore = this.calculateDiversificationScore(holdings, totalValue);
      
      // Generate recommendations
      const recommendations = this.generateDiversificationRecommendations(
        topHoldings,
        diversificationScore
      );

      return {
        topHoldings,
        diversificationScore,
        recommendations,
      };
    } catch (error) {
      logger.error('Failed to assess concentration risk', { params, error });
      return {
        topHoldings: [],
        diversificationScore: 5,
        recommendations: ['Unable to assess concentration risk'],
      };
    }
  }

  // Helper methods
  private async calculateLiquidationRisk(
    portfolioBalances: Map<number, TokenBalance[]>
  ): Promise<RiskAnalysis['liquidationRisk']> {
    // Mock implementation - would integrate with lending protocols
    return {
      positions: [
        {
          protocol: 'Aave',
          healthFactor: '1.8',
          liquidationPrice: '2800',
          timeToLiquidation: '2 days',
        },
      ],
    };
  }

  private async calculateImpermanentLossRisk(
    portfolioBalances: Map<number, TokenBalance[]>
  ): Promise<RiskAnalysis['impermanentLossRisk']> {
    // Mock implementation - would analyze LP positions
    return {
      lpPositions: [
        {
          protocol: 'Uniswap V3',
          pair: 'ETH/USDC',
          currentIL: '2.5%',
          projectedIL: '5.2%',
        },
      ],
    };
  }

  private async calculateConcentrationRisk(
    portfolioBalances: Map<number, TokenBalance[]>
  ): Promise<RiskAnalysis['concentrationRisk']> {
    const holdings: Array<{ symbol: string; percentage: string }> = [];
    
    // Mock calculation
    holdings.push(
      { symbol: 'ETH', percentage: '45.2' },
      { symbol: 'USDC', percentage: '25.8' },
      { symbol: 'WBTC', percentage: '15.3' }
    );

    return { topHoldings: holdings };
  }

  private calculateOverallRiskScore(
    liquidationRisk: RiskAnalysis['liquidationRisk'],
    impermanentLossRisk: RiskAnalysis['impermanentLossRisk'],
    concentrationRisk: RiskAnalysis['concentrationRisk']
  ): number {
    let riskScore = 5; // Base score

    // Adjust for liquidation risk
    const avgHealthFactor = liquidationRisk.positions.reduce((sum, pos) => 
      sum + parseFloat(pos.healthFactor), 0) / liquidationRisk.positions.length;
    
    if (avgHealthFactor < 1.5) riskScore += 3;
    else if (avgHealthFactor < 2.0) riskScore += 2;
    else if (avgHealthFactor < 2.5) riskScore += 1;

    // Adjust for concentration risk
    const topHoldingPercentage = parseFloat(concentrationRisk.topHoldings[0]?.percentage || '0');
    if (topHoldingPercentage > 50) riskScore += 2;
    else if (topHoldingPercentage > 30) riskScore += 1;

    return Math.min(Math.max(riskScore, 1), 10);
  }

  private generateRiskRecommendations(
    overallRiskScore: number,
    liquidationRisk: RiskAnalysis['liquidationRisk'],
    impermanentLossRisk: RiskAnalysis['impermanentLossRisk'],
    concentrationRisk: RiskAnalysis['concentrationRisk']
  ): string[] {
    const recommendations: string[] = [];

    if (overallRiskScore > 7) {
      recommendations.push('High risk detected - consider reducing position sizes');
    }

    if (liquidationRisk.positions.length > 0) {
      recommendations.push('Monitor liquidation risks closely and consider adding collateral');
    }

    if (concentrationRisk.topHoldings.length > 0) {
      const topPercentage = parseFloat(concentrationRisk.topHoldings[0].percentage);
      if (topPercentage > 40) {
        recommendations.push('Portfolio is highly concentrated - consider diversifying');
      }
    }

    if (impermanentLossRisk.lpPositions.length > 0) {
      recommendations.push('Monitor impermanent loss on LP positions');
    }

    return recommendations;
  }

  private calculateCurrentIL(
    entryPrice0: number,
    entryPrice1: number,
    currentPrice0: number,
    currentPrice1: number
  ): number {
    const priceRatio = (currentPrice0 / currentPrice1) / (entryPrice0 / entryPrice1);
    const il = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
    return Math.abs(il) * 100;
  }

  private projectImpermanentLoss(
    currentIL: number,
    volatility0: number,
    volatility1: number
  ): number {
    const avgVolatility = (volatility0 + volatility1) / 2;
    return currentIL * (1 + avgVolatility / 100);
  }

  private assessLiquidationSeverity(healthFactor: number): 'low' | 'medium' | 'high' | 'critical' {
    if (healthFactor < 1.1) return 'critical';
    if (healthFactor < 1.3) return 'high';
    if (healthFactor < 1.5) return 'medium';
    return 'low';
  }

  private assessILSeverity(currentIL: number): 'low' | 'medium' | 'high' {
    if (currentIL > 10) return 'high';
    if (currentIL > 5) return 'medium';
    return 'low';
  }

  private assessHoldingRisk(percentage: number): 'low' | 'medium' | 'high' {
    if (percentage > 0.5) return 'high';
    if (percentage > 0.3) return 'medium';
    return 'low';
  }

  private calculateDiversificationScore(
    holdings: Array<{ symbol: string; value: number }>,
    totalValue: number
  ): number {
    // Calculate Herfindahl-Hirschman Index (HHI)
    const hhi = holdings.reduce((sum, holding) => {
      const share = holding.value / totalValue;
      return sum + (share * share);
    }, 0);

    // Convert to 0-10 scale (lower HHI = higher diversification)
    return Math.max(0, 10 - (hhi * 10));
  }

  private generateDiversificationRecommendations(
    topHoldings: Array<{ symbol: string; percentage: string; riskLevel: string }>,
    diversificationScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (diversificationScore < 5) {
      recommendations.push('Portfolio lacks diversification - consider spreading investments');
    }

    const highRiskHoldings = topHoldings.filter(h => h.riskLevel === 'high');
    if (highRiskHoldings.length > 0) {
      recommendations.push(`Reduce concentration in ${highRiskHoldings.map(h => h.symbol).join(', ')}`);
    }

    if (topHoldings.length < 5) {
      recommendations.push('Consider adding more assets to improve diversification');
    }

    return recommendations;
  }
}

export default RiskAgent;
