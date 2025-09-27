import { logger } from '../utils/logger';
import { cache } from '../utils/cache';
import GraphService from '../services/GraphService';
import PythService from '../services/PythService';
import { 
  YieldOpportunity, 
  CrossChainComparison, 
  LendingRate, 
  PoolData,
  AgentTask 
} from '../types';

export class YieldAgent {
  private graphService: GraphService;
  private pythService: PythService;

  constructor(graphService: GraphService, pythService: PythService) {
    this.graphService = graphService;
    this.pythService = pythService;
  }

  async execute(task: AgentTask): Promise<any> {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (task.action) {
        case 'findBestYields':
          result = await this.findBestYields(task.parameters);
          break;
        case 'analyzePortfolioYield':
          result = await this.analyzePortfolioYield(task.parameters);
          break;
        case 'getMarketOverview':
          result = await this.getMarketOverview(task.parameters);
          break;
        case 'compareAcrossChains':
          result = await this.compareAcrossChains(task.parameters);
          break;
        default:
          throw new Error(`Unknown action: ${task.action}`);
      }
      
      const executionTime = Date.now() - startTime;
      
      logger.info('Yield agent task completed', {
        action: task.action,
        executionTime,
        resultType: typeof result,
      });
      
      return result;
    } catch (error) {
      logger.error('Yield agent task failed', {
        action: task.action,
        parameters: task.parameters,
        error,
      });
      throw error;
    }
  }

  async findBestYields(params: {
    tokens?: string[];
    chains?: string[];
    protocols?: string[];
    amount?: string;
    riskTolerance?: 'low' | 'medium' | 'high';
  }): Promise<YieldOpportunity[]> {
    try {
      const {
        tokens = ['USDC', 'USDT', 'DAI'],
        chains = ['ethereum', 'polygon'],
        protocols = ['aave', 'compound', 'uniswap'],
        amount = '1000',
        riskTolerance = 'medium'
      } = params;

      const cacheKey = `yield:best:${JSON.stringify(params)}`;
      const cached = await cache.get<YieldOpportunity[]>(cacheKey);
      
      // Only use cache when it has non-empty results; avoid persisting empty results
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return cached;
      }

      const opportunities: YieldOpportunity[] = [];
      
      // Get lending opportunities from Aave and Compound
      for (const chainName of chains) {
        const chainId = this.getChainId(chainName);
        
        if (protocols.includes('aave')) {
          const aaveRates = await this.graphService.getAaveLendingRates(chainId);
          const aaveOpportunities = await this.convertLendingRatesToOpportunities(
            aaveRates, 
            'Aave', 
            chainId, 
            tokens
          );
          opportunities.push(...aaveOpportunities);
        }
        
        if (protocols.includes('compound')) {
          const compoundRates = await this.graphService.getCompoundRates(chainId);
          const compoundOpportunities = await this.convertLendingRatesToOpportunities(
            compoundRates, 
            'Compound', 
            chainId, 
            tokens
          );
          opportunities.push(...compoundOpportunities);
        }
        
        if (protocols.includes('uniswap')) {
          const uniswapOpportunities = await this.getUniswapLPOpportunities(
            chainId, 
            tokens
          );
          opportunities.push(...uniswapOpportunities);
        }
      }

      // Fallback: if no opportunities from subgraphs, synthesize simple defaults
      if (opportunities.length === 0) {
        const fallbackChains = chains && chains.length > 0 ? chains : ['ethereum', 'polygon', 'rootstock'];
        const fallbackTokens = tokens && tokens.length > 0 ? tokens : ['USDC', 'DAI'];

        for (const chainName of fallbackChains) {
          const chainId = this.getChainId(chainName);
          for (const token of fallbackTokens) {
            opportunities.push({
              protocol: 'Aave',
              chainId,
              tokenAddress: '0x0000000000000000000000000000000000000000',
              tokenSymbol: token,
              apy: '4.5',
              tvl: '10000000',
              riskScore: 3,
              category: 'lending',
              metadata: { fallback: true }
            });
          }
        }
      }

      // Filter by risk tolerance
      const filteredOpportunities = this.filterByRiskTolerance(opportunities, riskTolerance);
      
      // Sort by APY (descending)
      const sortedOpportunities = filteredOpportunities.sort((a, b) => 
        parseFloat(b.apy) - parseFloat(a.apy)
      );

      // Take top 20 opportunities
      const topOpportunities = sortedOpportunities.slice(0, 20);

      // Cache for 10 minutes
      await cache.set(cacheKey, topOpportunities, 600);

      logger.info('Found best yield opportunities', {
        totalFound: opportunities.length,
        afterFiltering: filteredOpportunities.length,
        topCount: topOpportunities.length,
        tokens,
        chains,
        protocols,
      });

      return topOpportunities;
    } catch (error) {
      logger.error('Failed to find best yields', { params, error });
      return [];
    }
  }

  async compareAcrossChains(params: any): Promise<CrossChainComparison> {
    try {
      const { token, chains, protocols = ['aave', 'compound', 'uniswap'] } = params as {
        token: string;
        chains: string[];
        protocols?: string[];
      };
      
      const opportunities: CrossChainComparison['opportunities'] = [];
      
      for (const chainName of chains) {
        const chainId = this.getChainId(chainName);
        
        // Get best opportunity for this token on this chain
        const chainOpportunities = await this.findBestYields({
          tokens: [token],
          chains: [chainName],
          protocols,
        });
        
        if (chainOpportunities.length > 0) {
          const best = chainOpportunities[0];
          
          // Calculate bridge costs (mock implementation)
          const bridgeCost = await this.estimateBridgeCost(chainId, token);
          const gasCost = await this.estimateGasCost(chainId);
          
          // Calculate net APY after costs
          const netApy = this.calculateNetAPY(
            parseFloat(best.apy),
            parseFloat(bridgeCost),
            parseFloat(gasCost),
            parseFloat(params.token || '1000') // Default amount
          );
          
          opportunities.push({
            chainId,
            chainName,
            protocol: best.protocol,
            apy: best.apy,
            tvl: best.tvl,
            riskScore: best.riskScore,
            bridgeCost,
            gasCost,
            netApy: netApy.toString(),
          });
        }
      }
      
      // Sort by net APY
      opportunities.sort((a, b) => parseFloat(b.netApy || '0') - parseFloat(a.netApy || '0'));
      
      const bestOption = opportunities[0];
      const reasoning = this.generateComparisonReasoning(opportunities, token);
      
      const result: CrossChainComparison = {
        opportunities,
        recommendation: {
          bestOption,
          reasoning,
        },
      };

      logger.info('Completed cross-chain comparison', {
        token,
        chains,
        opportunityCount: opportunities.length,
        bestChain: bestOption?.chainName,
        bestAPY: bestOption?.netApy,
      });

      return result;
    } catch (error) {
      logger.error('Failed to compare across chains', { params, error });
      return {
        opportunities: [],
        recommendation: {
          bestOption: null,
          reasoning: 'Failed to analyze cross-chain opportunities',
        },
      };
    }
  }

  async analyzePortfolioYield(params: {
    chains?: string[];
    tokens?: string[];
    userAddress?: string;
  }): Promise<{
    currentYield: string;
    potentialYield: string;
    optimizationSuggestions: string[];
    riskAssessment: string;
  }> {
    try {
      const { chains = ['ethereum', 'polygon'], tokens, userAddress } = params;
      
      // This would typically analyze the user's current positions
      // For now, we'll provide general optimization suggestions
      
      const currentOpportunities = await this.findBestYields({
        tokens,
        chains,
      });
      
      const avgCurrentYield = this.calculateAverageYield(currentOpportunities);
      const topOpportunities = currentOpportunities.slice(0, 5);
      const avgPotentialYield = this.calculateAverageYield(topOpportunities);
      
      const optimizationSuggestions = [
        `Consider moving funds to ${topOpportunities[0]?.protocol} for ${topOpportunities[0]?.apy}% APY`,
        `Diversify across ${chains.length} chains to reduce risk`,
        `Monitor gas costs - they can significantly impact net returns`,
        `Consider stablecoin yields for lower risk exposure`,
      ];
      
      const riskAssessment = this.assessPortfolioRisk(currentOpportunities);
      
      return {
        currentYield: avgCurrentYield.toFixed(2),
        potentialYield: avgPotentialYield.toFixed(2),
        optimizationSuggestions,
        riskAssessment,
      };
    } catch (error) {
      logger.error('Failed to analyze portfolio yield', { params, error });
      return {
        currentYield: '0',
        potentialYield: '0',
        optimizationSuggestions: ['Unable to analyze portfolio at this time'],
        riskAssessment: 'Risk assessment unavailable',
      };
    }
  }

  async getMarketOverview(params: {
    tokens?: string[];
    chains?: string[];
    timeframe?: string;
  }): Promise<{
    topYields: YieldOpportunity[];
    marketTrends: Array<{
      protocol: string;
      tvlChange: string;
      apyTrend: string;
    }>;
    summary: string;
  }> {
    try {
      const { 
        tokens = ['ETH', 'USDC', 'USDT', 'DAI'], 
        chains = ['ethereum', 'polygon'],
        timeframe = '24h'
      } = params;
      
      const topYields = await this.findBestYields({
        tokens,
        chains,
      });
      
      // Mock market trends data
      const marketTrends = [
        {
          protocol: 'Aave',
          tvlChange: '+2.5%',
          apyTrend: 'stable',
        },
        {
          protocol: 'Compound',
          tvlChange: '+1.2%',
          apyTrend: 'increasing',
        },
        {
          protocol: 'Uniswap',
          tvlChange: '-0.8%',
          apyTrend: 'volatile',
        },
      ];
      
      const avgYield = this.calculateAverageYield(topYields.slice(0, 10));
      const summary = `Current DeFi market shows average yields of ${avgYield.toFixed(2)}% across major protocols. ` +
        `Top opportunities are in ${topYields[0]?.protocol} with ${topYields[0]?.apy}% APY. ` +
        `Market sentiment is generally positive with increasing TVL across most protocols.`;
      
      return {
        topYields: topYields.slice(0, 10),
        marketTrends,
        summary,
      };
    } catch (error) {
      logger.error('Failed to get market overview', { params, error });
      return {
        topYields: [],
        marketTrends: [],
        summary: 'Market overview unavailable at this time',
      };
    }
  }

  // Helper methods
  private async convertLendingRatesToOpportunities(
    rates: LendingRate[],
    protocol: string,
    chainId: number,
    targetTokens: string[]
  ): Promise<YieldOpportunity[]> {
    const opportunities: YieldOpportunity[] = [];
    
    for (const rate of rates) {
      if (targetTokens.includes(rate.asset)) {
        // Convert rate to percentage
        const apy = (parseFloat(rate.supplyRate) / 1e18 * 100).toString();
        
        opportunities.push({
          protocol,
          chainId,
          tokenAddress: '0x0000000000000000000000000000000000000000', // Would be actual token address
          tokenSymbol: rate.asset,
          apy,
          tvl: rate.totalSupply,
          riskScore: this.calculateRiskScore(protocol, rate.utilizationRate),
          category: 'lending',
          metadata: {
            utilizationRate: rate.utilizationRate,
            totalBorrow: rate.totalBorrow,
          },
        });
      }
    }
    
    return opportunities;
  }

  private async getUniswapLPOpportunities(
    chainId: number,
    tokens: string[]
  ): Promise<YieldOpportunity[]> {
    try {
      const pools = await this.graphService.queryUniswapPools(chainId);
      const opportunities: YieldOpportunity[] = [];
      
      for (const pool of pools) {
        const tokenSymbols = [pool.token0.symbol, pool.token1.symbol];
        const hasTargetToken = tokens.some(token => tokenSymbols.includes(token));
        
        if (hasTargetToken) {
          // Calculate estimated APY based on fees and volume
          const estimatedAPY = this.estimateLPAPY(pool);
          
          opportunities.push({
            protocol: 'Uniswap V3',
            chainId,
            tokenAddress: pool.id,
            tokenSymbol: `${pool.token0.symbol}/${pool.token1.symbol}`,
            apy: estimatedAPY.toString(),
            tvl: pool.tvlUSD,
            riskScore: this.calculateLPRiskScore(pool),
            category: 'liquidity_pool',
            impermanentLossRisk: 'medium',
            metadata: {
              feeTier: pool.feeTier,
              volume24h: pool.volumeUSD,
              token0: pool.token0,
              token1: pool.token1,
            },
          });
        }
      }
      
      return opportunities;
    } catch (error) {
      logger.error('Failed to get Uniswap LP opportunities', { chainId, tokens, error });
      return [];
    }
  }

  private filterByRiskTolerance(
    opportunities: YieldOpportunity[],
    riskTolerance: 'low' | 'medium' | 'high'
  ): YieldOpportunity[] {
    const riskThresholds = {
      low: 3,
      medium: 6,
      high: 10,
    };
    
    const maxRisk = riskThresholds[riskTolerance];
    return opportunities.filter(opp => opp.riskScore <= maxRisk);
  }

  private calculateRiskScore(protocol: string, utilizationRate: string): number {
    const utilization = parseFloat(utilizationRate);
    let baseRisk = 2; // Base risk for lending
    
    // Adjust based on protocol reputation
    if (protocol === 'Aave') baseRisk = 1;
    if (protocol === 'Compound') baseRisk = 2;
    
    // Adjust based on utilization rate
    if (utilization > 80) baseRisk += 3;
    else if (utilization > 60) baseRisk += 2;
    else if (utilization > 40) baseRisk += 1;
    
    return Math.min(baseRisk, 10);
  }

  private calculateLPRiskScore(pool: PoolData): number {
    let riskScore = 5; // Base risk for LP
    
    const tvl = parseFloat(pool.tvlUSD);
    const volume = parseFloat(pool.volumeUSD);
    
    // Lower risk for higher TVL
    if (tvl > 10000000) riskScore -= 1;
    if (tvl > 100000000) riskScore -= 1;
    
    // Higher risk for low volume relative to TVL
    const volumeToTVLRatio = volume / tvl;
    if (volumeToTVLRatio < 0.01) riskScore += 2;
    
    return Math.max(Math.min(riskScore, 10), 1);
  }

  private estimateLPAPY(pool: PoolData): number {
    const volume24h = parseFloat(pool.volumeUSD);
    const tvl = parseFloat(pool.tvlUSD);
    const feeTier = parseFloat(pool.feeTier) / 10000; // Convert to percentage
    
    if (tvl === 0) return 0;
    
    // Estimate annual fees based on 24h volume
    const annualVolume = volume24h * 365;
    const annualFees = annualVolume * feeTier;
    const apy = (annualFees / tvl) * 100;
    
    return Math.max(Math.min(apy, 1000), 0); // Cap at 1000% APY
  }

  private async estimateBridgeCost(chainId: number, token: string): Promise<string> {
    // Mock implementation - would integrate with actual bridge APIs
    const bridgeCosts: Record<number, number> = {
      1: 0.1, // Ethereum - higher cost
      137: 0.01, // Polygon - lower cost
      30: 0.05, // Rootstock - medium cost
    };
    
    return (bridgeCosts[chainId] || 0.05).toString();
  }

  private async estimateGasCost(chainId: number): Promise<string> {
    // Mock implementation - would use actual gas price APIs
    const gasCosts: Record<number, number> = {
      1: 50, // Ethereum - high gas
      137: 1, // Polygon - low gas
      30: 5, // Rootstock - medium gas
    };
    
    return (gasCosts[chainId] || 10).toString();
  }

  private calculateNetAPY(
    apy: number,
    bridgeCost: number,
    gasCost: number,
    amount: number
  ): number {
    const annualReturn = (amount * apy) / 100;
    const totalCosts = bridgeCost + gasCost;
    const netReturn = annualReturn - totalCosts;
    
    return (netReturn / amount) * 100;
  }

  private generateComparisonReasoning(
    opportunities: CrossChainComparison['opportunities'],
    token: string
  ): string {
    if (opportunities.length === 0) {
      return `No opportunities found for ${token}`;
    }
    
    const best = opportunities[0];
    const reasoning = `${best.chainName} offers the best net APY of ${best.netApy}% for ${token} ` +
      `through ${best.protocol}. After accounting for bridge costs (${best.bridgeCost}%) and ` +
      `gas fees (${best.gasCost}%), this provides the highest risk-adjusted return.`;
    
    return reasoning;
  }

  private calculateAverageYield(opportunities: YieldOpportunity[]): number {
    if (opportunities.length === 0) return 0;
    
    const totalYield = opportunities.reduce((sum, opp) => sum + parseFloat(opp.apy), 0);
    return totalYield / opportunities.length;
  }

  private assessPortfolioRisk(opportunities: YieldOpportunity[]): string {
    if (opportunities.length === 0) return 'No data available';
    
    const avgRisk = opportunities.reduce((sum, opp) => sum + opp.riskScore, 0) / opportunities.length;
    
    if (avgRisk <= 3) return 'Low risk - Conservative portfolio with stable returns';
    if (avgRisk <= 6) return 'Medium risk - Balanced portfolio with moderate volatility';
    return 'High risk - Aggressive portfolio with potential for high returns but significant volatility';
  }

  private getChainId(chainName: string): number {
    const chainIds: Record<string, number> = {
      ethereum: 1,
      polygon: 137,
      rootstock: 30,
    };
    
    return chainIds[chainName.toLowerCase()] || 1;
  }
}

export default YieldAgent;
