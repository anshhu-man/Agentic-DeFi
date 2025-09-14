import axios from 'axios';
import { ethers } from 'ethers';
import { logger } from '@/utils/logger';
import { cache } from '@/utils/redis';
import { config, PRICE_FEED_IDS } from '@/config';

export interface PythPriceData {
  id: string;
  price: string;
  confidence: string;
  expo: number;
  publishTime: number;
}

export interface YieldCalculationResult {
  estimatedAPY: number;
  confidence: number;
  priceImpact: number;
  optimalTradeSize: string;
  riskScore: number;
}

export interface ArbitrageOpportunity {
  tokenId: string;
  arbitrageOpportunity: number;
  sourceChain: number;
  targetChain: number;
  profitPotential: number;
  confidence: number;
}

export class EnhancedPythService {
  private hermesEndpoint: string;
  private providers: Map<number, ethers.providers.JsonRpcProvider> = new Map();
  
  // Pyth contract addresses for different chains
  private readonly PYTH_CONTRACT_ADDRESSES: Record<number, string> = {
    1: '0x4305FB66699C3B2702D4d05CF36551390A4c69C6', // Ethereum
    137: '0xff1a0f4744e8582DF1aE09D5611b887B6a12925C', // Polygon
    30: '0x2880aB155794e7179c9eE2e38200202908C17B43', // Rootstock (example)
  };
  
  constructor() {
    this.hermesEndpoint = 'https://hermes.pyth.network';
    this.initializeProviders();
    
    logger.info('Enhanced Pyth Service initialized with Pull Oracle support');
  }
  
  private initializeProviders(): void {
    // Initialize providers for different chains
    this.providers.set(1, new ethers.providers.JsonRpcProvider(
      `https://eth-mainnet.g.alchemy.com/v2/${config.apiKeys.alchemy}`
    ));
    
    this.providers.set(137, new ethers.providers.JsonRpcProvider(
      `https://polygon-mainnet.g.alchemy.com/v2/${config.apiKeys.alchemy}`
    ));
    
    this.providers.set(30, new ethers.providers.JsonRpcProvider(
      'https://public-node.rsk.co'
    ));
  }
  
  // STEP 1: Pull/Fetch data from Hermes
  async fetchPriceUpdates(priceIds: string[]): Promise<string[]> {
    try {
      logger.info('Fetching price updates from Hermes', { priceIds });
      
      // Fetch price update data from Hermes API
      const response = await axios.get(`${this.hermesEndpoint}/api/get_price_feed_ids`, {
        params: {
          ids: priceIds
        },
        timeout: 10000
      });
      
      // Extract update data from response
      const priceUpdateData: string[] = [];
      
      if (response.data && Array.isArray(response.data)) {
        for (const feed of response.data) {
          if (feed.vaa) {
            priceUpdateData.push(feed.vaa);
          }
        }
      }
      
      logger.info('Successfully fetched price updates from Hermes', {
        priceIds,
        updateCount: priceUpdateData.length
      });
      
      // Cache the update data for a short time
      const cacheKey = `pyth:updates:${priceIds.join(',')}`;
      await cache.set(cacheKey, priceUpdateData, 30); // 30 seconds cache
      
      return priceUpdateData;
    } catch (error: any) {
      logger.error('Failed to fetch price updates from Hermes', { 
        priceIds, 
        error: error?.message || 'Unknown error'
      });
      
      // Try alternative Hermes endpoint
      try {
        const altResponse = await axios.post(`${this.hermesEndpoint}/api/latest_vaas`, {
          ids: priceIds
        }, {
          timeout: 10000
        });
        
        const altPriceUpdateData: string[] = [];
        if (altResponse.data && Array.isArray(altResponse.data)) {
          altPriceUpdateData.push(...altResponse.data);
        }
        
        return altPriceUpdateData;
      } catch (altError: any) {
        logger.error('Alternative Hermes endpoint also failed', { 
          error: altError?.message || 'Unknown error'
        });
        throw new Error(`Failed to fetch price updates: ${error?.message || 'Unknown error'}`);
      }
    }
  }
  
  // STEP 2: Update data on-chain using updatePriceFeeds method
  async updateOnChainPrices(
    priceUpdateData: string[],
    chainId: number,
    privateKey?: string
  ): Promise<{ success: boolean; txHash?: string; updateFee?: string }> {
    try {
      const contractAddress = this.PYTH_CONTRACT_ADDRESSES[chainId];
      if (!contractAddress) {
        throw new Error(`Pyth contract not available for chain ${chainId}`);
      }
      
      const provider = this.providers.get(chainId);
      if (!provider) {
        throw new Error(`Provider not available for chain ${chainId}`);
      }
      
      // For demo purposes, we'll simulate the update without actually sending a transaction
      // In production, you would need a private key to sign transactions
      if (!privateKey) {
        logger.info('Simulating on-chain price update (no private key provided)', {
          chainId,
          contractAddress,
          updateCount: priceUpdateData.length
        });
        
        return {
          success: true,
          txHash: '0x' + Math.random().toString(16).substr(2, 64), // Mock tx hash
          updateFee: '0.001' // Mock fee
        };
      }
      
      const signer = new ethers.Wallet(privateKey, provider);
      
      // Pyth contract ABI for updatePriceFeeds
      const pythAbi = [
        "function updatePriceFeeds(bytes[] calldata updateData) external payable",
        "function getUpdateFee(bytes[] calldata updateData) external view returns (uint feeAmount)"
      ];
      
      const pythContract = new ethers.Contract(contractAddress, pythAbi, signer);
      
      // Get update fee
      const updateFee = await pythContract.getUpdateFee(priceUpdateData);
      
      // Update price feeds on-chain
      const tx = await pythContract.updatePriceFeeds(priceUpdateData, {
        value: updateFee,
        gasLimit: 500000 // Set appropriate gas limit
      });
      
      const receipt = await tx.wait();
      
      logger.info('Successfully updated on-chain prices', {
        chainId,
        txHash: receipt.transactionHash,
        updateFee: updateFee.toString(),
        priceUpdateCount: priceUpdateData.length,
        gasUsed: receipt.gasUsed.toString()
      });
      
      return {
        success: true,
        txHash: receipt.transactionHash,
        updateFee: updateFee.toString()
      };
      
    } catch (error: any) {
      logger.error('Failed to update on-chain prices', { 
        chainId, 
        error: error?.message || 'Unknown error'
      });
      return { success: false };
    }
  }
  
  // STEP 3: Consume the price
  async getLatestPrices(
    priceIds: string[],
    chainId: number,
    maxAge: number = 60
  ): Promise<PythPriceData[]> {
    try {
      const contractAddress = this.PYTH_CONTRACT_ADDRESSES[chainId];
      if (!contractAddress) {
        throw new Error(`Pyth contract not available for chain ${chainId}`);
      }
      
      const provider = this.providers.get(chainId);
      if (!provider) {
        throw new Error(`Provider not available for chain ${chainId}`);
      }
      
      const pythAbi = [
        "function getPrice(bytes32 id) external view returns (int64 price, uint64 conf, int32 expo, uint publishTime)",
        "function getPriceNoOlderThan(bytes32 id, uint age) external view returns (int64 price, uint64 conf, int32 expo, uint publishTime)"
      ];
      
      const pythContract = new ethers.Contract(contractAddress, pythAbi, provider);
      
      const prices: PythPriceData[] = [];
      
      for (const priceId of priceIds) {
        try {
          // Get price no older than specified age
          const priceData = await pythContract.getPriceNoOlderThan(
            priceId, 
            maxAge
          );
          
          prices.push({
            id: priceId,
            price: priceData.price.toString(),
            confidence: priceData.conf.toString(),
            expo: priceData.expo,
            publishTime: priceData.publishTime
          });
          
        } catch (priceError: any) {
          logger.warn('Failed to get price for specific feed', { 
            priceId, 
            error: priceError?.message || 'Unknown error'
          });
          
          // Try fallback to regular getPrice
          try {
            const fallbackPrice = await pythContract.getPrice(priceId);
            prices.push({
              id: priceId,
              price: fallbackPrice.price.toString(),
              confidence: fallbackPrice.conf.toString(),
              expo: fallbackPrice.expo,
              publishTime: fallbackPrice.publishTime
            });
          } catch (fallbackError: any) {
            logger.error('Failed to get fallback price', { 
              priceId, 
              error: fallbackError?.message || 'Unknown error'
            });
          }
        }
      }
      
      logger.info('Retrieved latest prices from on-chain', {
        chainId,
        requestedCount: priceIds.length,
        retrievedCount: prices.length
      });
      
      return prices;
      
    } catch (error: any) {
      logger.error('Failed to get latest prices', { 
        chainId, 
        priceIds, 
        error: error?.message || 'Unknown error'
      });
      return [];
    }
  }
  
  // Alternative method to get prices directly from Hermes (for testing)
  async getLatestPricesFromHermes(priceIds: string[]): Promise<PythPriceData[]> {
    try {
      logger.info('Fetching latest prices from Hermes API', { priceIds });
      
      const response = await axios.get(`${this.hermesEndpoint}/api/latest_price_feeds`, {
        params: {
          ids: priceIds
        },
        timeout: 10000
      });
      
      const prices: PythPriceData[] = [];
      
      if (response.data && Array.isArray(response.data)) {
        for (const feed of response.data) {
          if (feed.id && feed.price) {
            prices.push({
              id: feed.id,
              price: feed.price.price,
              confidence: feed.price.conf,
              expo: feed.price.expo,
              publishTime: feed.price.publish_time
            });
          }
        }
      }
      
      logger.info('Successfully retrieved prices from Hermes', {
        priceIds,
        priceCount: prices.length
      });
      
      return prices;
      
    } catch (error: any) {
      logger.error('Failed to get prices from Hermes', { 
        priceIds, 
        error: error?.message || 'Unknown error'
      });
      return [];
    }
  }
  
  // INNOVATION: Real-time Yield Calculation with Confidence
  async calculateYieldWithConfidence(
    baseTokenId: string,
    quoteTokenId: string,
    poolLiquidity: string,
    volume24h: string,
    chainId: number = 1
  ): Promise<YieldCalculationResult> {
    try {
      // 1. Fetch fresh price updates from Hermes
      const priceUpdateData = await this.fetchPriceUpdates([baseTokenId, quoteTokenId]);
      
      // 2. Update prices on-chain (simulated for demo)
      const updateResult = await this.updateOnChainPrices(priceUpdateData, chainId);
      
      if (!updateResult.success) {
        logger.warn('Price update failed, using Hermes data directly');
      }
      
      // 3. Get latest prices (try on-chain first, fallback to Hermes)
      let prices = await this.getLatestPrices([baseTokenId, quoteTokenId], chainId);
      
      if (prices.length < 2) {
        logger.info('Falling back to Hermes API for price data');
        prices = await this.getLatestPricesFromHermes([baseTokenId, quoteTokenId]);
      }
      
      if (prices.length < 2) {
        throw new Error('Insufficient price data from both on-chain and Hermes');
      }
      
      const basePrice = prices[0];
      const quotePrice = prices[1];
      
      // Calculate actual price values
      const basePriceValue = parseFloat(basePrice.price) * Math.pow(10, basePrice.expo);
      const quotePriceValue = parseFloat(quotePrice.price) * Math.pow(10, quotePrice.expo);
      
      // Calculate confidence based on price confidence intervals
      const baseConfidence = parseFloat(basePrice.confidence) * Math.pow(10, basePrice.expo);
      const quoteConfidence = parseFloat(quotePrice.confidence) * Math.pow(10, quotePrice.expo);
      
      const baseConfidenceRatio = baseConfidence / Math.abs(basePriceValue);
      const quoteConfidenceRatio = quoteConfidence / Math.abs(quotePriceValue);
      const avgConfidenceRatio = (baseConfidenceRatio + quoteConfidenceRatio) / 2;
      
      // Convert to confidence score (higher is better)
      const confidenceScore = Math.max(0, 100 - (avgConfidenceRatio * 100));
      
      // Calculate estimated APY based on volume and liquidity
      const liquidityNum = parseFloat(poolLiquidity);
      const volumeNum = parseFloat(volume24h);
      
      if (liquidityNum === 0) {
        throw new Error('Pool liquidity cannot be zero');
      }
      
      const feeRate = 0.003; // 0.3% fee assumption
      const annualVolume = volumeNum * 365;
      const annualFees = annualVolume * feeRate;
      const estimatedAPY = (annualFees / liquidityNum) * 100;
      
      // Calculate price impact and optimal trade size
      const priceImpact = this.calculatePriceImpact(liquidityNum, volumeNum);
      const optimalTradeSize = this.calculateOptimalTradeSize(liquidityNum, priceImpact);
      
      // Calculate risk score based on confidence and volatility
      const riskScore = this.calculateRiskScore(confidenceScore, priceImpact, estimatedAPY);
      
      const result: YieldCalculationResult = {
        estimatedAPY: Math.max(0, Math.min(estimatedAPY, 1000)), // Cap at 1000%
        confidence: confidenceScore,
        priceImpact,
        optimalTradeSize: optimalTradeSize.toString(),
        riskScore
      };
      
      logger.info('Calculated yield with confidence', {
        baseTokenId,
        quoteTokenId,
        result
      });
      
      return result;
      
    } catch (error: any) {
      logger.error('Failed to calculate yield with confidence', { 
        baseTokenId, 
        quoteTokenId, 
        error: error?.message || 'Unknown error'
      });
      
      return {
        estimatedAPY: 0,
        confidence: 0,
        priceImpact: 0,
        optimalTradeSize: '0',
        riskScore: 10 // Maximum risk for failed calculation
      };
    }
  }
  
  // INNOVATION: Cross-Chain Price Arbitrage Detection
  async detectCrossChainArbitrage(
    tokenPriceIds: string[],
    chains: Array<{ chainId: number }>
  ): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    
    try {
      for (const tokenId of tokenPriceIds) {
        const chainPrices: Array<{
          chainId: number;
          price: number;
          confidence: number;
          publishTime: number;
        }> = [];
        
        // Get prices from each chain
        for (const chain of chains) {
          try {
            let prices = await this.getLatestPrices([tokenId], chain.chainId);
            
            // Fallback to Hermes if on-chain fails
            if (prices.length === 0) {
              prices = await this.getLatestPricesFromHermes([tokenId]);
            }
            
            if (prices.length > 0) {
              const priceData = prices[0];
              const priceValue = parseFloat(priceData.price) * Math.pow(10, priceData.expo);
              const confidenceValue = parseFloat(priceData.confidence) * Math.pow(10, priceData.expo);
              const confidenceRatio = confidenceValue / Math.abs(priceValue);
              const confidenceScore = Math.max(0, 100 - (confidenceRatio * 100));
              
              chainPrices.push({
                chainId: chain.chainId,
                price: priceValue,
                confidence: confidenceScore,
                publishTime: priceData.publishTime
              });
            }
          } catch (chainError: any) {
            logger.warn('Failed to get price for chain', { 
              tokenId, 
              chainId: chain.chainId, 
              error: chainError?.message || 'Unknown error'
            });
          }
        }
        
        // Find arbitrage opportunities
        if (chainPrices.length >= 2) {
          const sortedPrices = chainPrices.sort((a, b) => a.price - b.price);
          const lowest = sortedPrices[0];
          const highest = sortedPrices[sortedPrices.length - 1];
          
          const priceDiff = highest.price - lowest.price;
          const arbitrageOpportunity = (priceDiff / lowest.price) * 100;
          
          // Only consider opportunities > 0.5% with good confidence and recent data
          const minConfidence = 70;
          const maxAgeSeconds = 300; // 5 minutes
          const currentTime = Math.floor(Date.now() / 1000);
          
          const isRecentData = (currentTime - lowest.publishTime) < maxAgeSeconds && 
                              (currentTime - highest.publishTime) < maxAgeSeconds;
          
          if (arbitrageOpportunity > 0.5 && 
              lowest.confidence > minConfidence && 
              highest.confidence > minConfidence &&
              isRecentData) {
            
            // Estimate costs (bridge fees, gas, slippage)
            const estimatedCosts = 0.3; // 0.3% estimated total costs
            const profitPotential = arbitrageOpportunity - estimatedCosts;
            
            if (profitPotential > 0) {
              opportunities.push({
                tokenId,
                arbitrageOpportunity,
                sourceChain: lowest.chainId,
                targetChain: highest.chainId,
                profitPotential,
                confidence: Math.min(lowest.confidence, highest.confidence)
              });
            }
          }
        }
      }
      
      // Sort by profit potential
      const sortedOpportunities = opportunities.sort((a, b) => b.profitPotential - a.profitPotential);
      
      logger.info('Detected cross-chain arbitrage opportunities', {
        tokenCount: tokenPriceIds.length,
        chainCount: chains.length,
        opportunityCount: sortedOpportunities.length
      });
      
      return sortedOpportunities;
      
    } catch (error: any) {
      logger.error('Failed to detect cross-chain arbitrage', { 
        tokenPriceIds, 
        chains, 
        error: error?.message || 'Unknown error'
      });
      return [];
    }
  }
  
  // Helper method to get multiple token prices efficiently
  async getMultipleTokenPrices(
    symbols: string[],
    chainId: number = 1
  ): Promise<Map<string, { price: number; confidence: number }>> {
    const priceMap = new Map<string, { price: number; confidence: number }>();
    
    try {
      const priceIds = symbols
        .map(symbol => this.getTokenPriceId(symbol))
        .filter((id): id is string => id !== null);
      
      if (priceIds.length === 0) {
        return priceMap;
      }
      
      // Try on-chain first, fallback to Hermes
      let prices = await this.getLatestPrices(priceIds, chainId);
      if (prices.length === 0) {
        prices = await this.getLatestPricesFromHermes(priceIds);
      }
      
      for (let i = 0; i < prices.length; i++) {
        const symbol = symbols[i];
        const priceData = prices[i];
        
        if (priceData) {
          const priceValue = parseFloat(priceData.price) * Math.pow(10, priceData.expo);
          const confidenceValue = parseFloat(priceData.confidence) * Math.pow(10, priceData.expo);
          const confidenceRatio = confidenceValue / Math.abs(priceValue);
          const confidenceScore = Math.max(0, 100 - (confidenceRatio * 100));
          
          priceMap.set(symbol, {
            price: priceValue,
            confidence: confidenceScore
          });
        }
      }
      
    } catch (error: any) {
      logger.error('Failed to get multiple token prices', { 
        symbols, 
        chainId, 
        error: error?.message || 'Unknown error'
      });
    }
    
    return priceMap;
  }
  
  // Helper methods
  private getTokenPriceId(symbol: string): string | null {
    const priceIdMap: Record<string, string> = {
      'ETH': PRICE_FEED_IDS['ETH/USD'],
      'BTC': PRICE_FEED_IDS['BTC/USD'],
      'MATIC': PRICE_FEED_IDS['MATIC/USD'],
      'USDC': PRICE_FEED_IDS['USDC/USD'],
      'USDT': PRICE_FEED_IDS['USDT/USD'],
      'DAI': PRICE_FEED_IDS['DAI/USD']
    };
    
    return priceIdMap[symbol.toUpperCase()] || null;
  }
  
  private calculatePriceImpact(liquidity: number, volume: number): number {
    if (liquidity === 0) return 10; // Maximum impact if no liquidity
    
    const liquidityRatio = volume / liquidity;
    return Math.min(liquidityRatio * 100, 10); // Cap at 10%
  }
  
  private calculateOptimalTradeSize(liquidity: number, priceImpact: number): number {
    const maxImpact = 1; // 1% max price impact target
    const optimalRatio = maxImpact / 100;
    return liquidity * optimalRatio;
  }
  
  private calculateRiskScore(confidence: number, priceImpact: number, apy: number): number {
    let riskScore = 5; // Base risk score
    
    // Adjust based on confidence (lower confidence = higher risk)
    if (confidence < 50) riskScore += 3;
    else if (confidence < 70) riskScore += 2;
    else if (confidence < 85) riskScore += 1;
    
    // Adjust based on price impact
    if (priceImpact > 5) riskScore += 2;
    else if (priceImpact > 2) riskScore += 1;
    
    // Adjust based on APY (very high APY might indicate higher risk)
    if (apy > 100) riskScore += 2;
    else if (apy > 50) riskScore += 1;
    
    return Math.min(Math.max(riskScore, 1), 10); // Keep between 1-10
  }
  
  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      // Test fetching a price update for ETH
      const ethPriceId = PRICE_FEED_IDS['ETH/USD'];
      if (!ethPriceId) return false;
      
      // Try Hermes API first
      const prices = await this.getLatestPricesFromHermes([ethPriceId]);
      return prices.length > 0;
      
    } catch (error: any) {
      logger.error('Pyth service health check failed', { 
        error: error?.message || 'Unknown error'
      });
      return false;
    }
  }
}

export default EnhancedPythService;
