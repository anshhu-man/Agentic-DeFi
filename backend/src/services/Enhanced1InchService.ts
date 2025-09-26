import axios, { AxiosResponse } from 'axios';
import { logger } from '../utils/logger';

// Enhanced 1inch Service Types
export interface Enhanced1InchTokenData {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
  providers?: string[];
  eip2612?: boolean;
  isFoT?: boolean;
}

export interface FusionSwapParams {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  fromAddress: string;
  toAddress?: string;
  slippage?: number;
  preset?: 'fast' | 'medium' | 'slow';
  source?: string;
  allowPartialFill?: boolean;
  includeTokensInfo?: boolean;
  includeProtocols?: boolean;
  includeGasInfo?: boolean;
}

export interface IntentBasedSwapParams {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  fromAddress: string;
  intent: 'best_price' | 'fastest' | 'lowest_gas' | 'balanced';
  constraints?: {
    maxSlippage?: number;
    maxGasPrice?: string;
    deadline?: number;
    minReturn?: string;
  };
}

export interface CrossChainSwapParams {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  fromAddress: string;
  slippage?: number;
  enableEstimate?: boolean;
}

export interface WalletBalanceParams {
  addresses: string[];
  chainId?: number;
}

export interface PriceParams {
  tokens: string[];
  chainId?: number;
  currency?: string;
}

export interface Enhanced1InchSwapResult {
  dstAmount: string;
  tx: {
    from: string;
    to: string;
    data: string;
    value: string;
    gasPrice: string;
    gas: string;
  };
  protocols?: any[];
  fromToken: Enhanced1InchTokenData;
  toToken: Enhanced1InchTokenData;
  fromTokenAmount: string;
  toTokenAmount: string;
  estimatedGas?: string;
}

export interface FusionOrderResult {
  orderHash: string;
  quoteId: string;
  fromTokenAmount: string;
  toTokenAmount: string;
  preset: string;
  auctionStartDate: number;
  auctionEndDate: number;
  initialRateBump: number;
  points: Array<{
    delay: number;
    coefficient: number;
  }>;
}

export interface WalletBalanceResult {
  [address: string]: {
    [tokenAddress: string]: {
      balance: string;
      symbol: string;
      name: string;
      decimals: number;
      price?: {
        value: number;
        currency: string;
      };
    };
  };
}

export interface PriceFeedResult {
  [tokenAddress: string]: {
    [currency: string]: number;
  };
}

export interface TokenMetadataResult {
  [tokenAddress: string]: Enhanced1InchTokenData;
}

/**
 * Enhanced 1inch Service with Fusion+, Intent-based swaps, and comprehensive API coverage
 * Based on 1inch API v6.0 documentation
 */
export class Enhanced1InchService {
  private baseUrl = 'https://api.1inch.dev';
  private chainId: number;
  private apiKey?: string;
  
  // Supported chain IDs for different features
  private readonly FUSION_SUPPORTED_CHAINS = [1, 137, 56, 42161, 10, 8453, 100, 324];
  private readonly CLASSIC_SWAP_CHAINS = [1, 137, 56, 42161, 10, 8453, 100, 324, 43114, 250];
  
  constructor(chainId: number = 1, apiKey?: string) {
    this.chainId = chainId;
    this.apiKey = apiKey;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    return headers;
  }

  private async makeRequest<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    try {
      const response: AxiosResponse<T> = await axios.get(`${this.baseUrl}${endpoint}`, {
        params,
        headers: this.getHeaders(),
        timeout: 30000,
      });
      
      return response.data;
    } catch (error) {
      logger.error('1inch API request failed', {
        endpoint,
        params,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ========================================
  // FUSION+ CROSS-CHAIN SWAPS
  // ========================================

  /**
   * Create a Fusion+ cross-chain swap order
   * Perfect for AI agents to execute cross-chain strategies
   */
  async createFusionCrossChainSwap(params: CrossChainSwapParams): Promise<FusionOrderResult> {
    if (!this.FUSION_SUPPORTED_CHAINS.includes(params.fromChainId) || 
        !this.FUSION_SUPPORTED_CHAINS.includes(params.toChainId)) {
      throw new Error(`Fusion+ not supported for chains ${params.fromChainId} -> ${params.toChainId}`);
    }

    const endpoint = `/fusion-plus/cross-chain/quote`;
    
    return await this.makeRequest<FusionOrderResult>(endpoint, {
      fromChainId: params.fromChainId,
      toChainId: params.toChainId,
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
      fromAddress: params.fromAddress,
      slippage: params.slippage || 1,
      enableEstimate: params.enableEstimate || true,
    });
  }

  /**
   * Get Fusion+ cross-chain swap status
   */
  async getFusionCrossChainStatus(orderHash: string): Promise<any> {
    const endpoint = `/fusion-plus/cross-chain/status/${orderHash}`;
    return await this.makeRequest(endpoint);
  }

  // ========================================
  // INTENT-BASED SWAPS (FUSION)
  // ========================================

  /**
   * Create intent-based swap using Fusion
   * AI agents can express user intents naturally
   */
  async createIntentBasedSwap(params: IntentBasedSwapParams): Promise<FusionOrderResult> {
    if (!this.FUSION_SUPPORTED_CHAINS.includes(this.chainId)) {
      throw new Error(`Fusion not supported on chain ${this.chainId}`);
    }

    const endpoint = `/fusion/swap`;
    
    // Map intent to Fusion preset
    const presetMap = {
      'best_price': 'slow',
      'fastest': 'fast', 
      'lowest_gas': 'medium',
      'balanced': 'medium'
    };

    const fusionParams: FusionSwapParams = {
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
      fromAddress: params.fromAddress,
      preset: presetMap[params.intent] as 'fast' | 'medium' | 'slow',
      slippage: params.constraints?.maxSlippage || 1,
      allowPartialFill: params.intent === 'best_price',
      includeTokensInfo: true,
      includeProtocols: true,
      includeGasInfo: true,
    };

    return await this.makeRequest<FusionOrderResult>(endpoint, fusionParams);
  }

  /**
   * Get Fusion swap quote (for planning)
   */
  async getFusionQuote(params: FusionSwapParams): Promise<any> {
    const endpoint = `/fusion/quote`;
    return await this.makeRequest(endpoint, params);
  }

  /**
   * Get active Fusion orders for address
   */
  async getActiveFusionOrders(address: string): Promise<any[]> {
    const endpoint = `/fusion/orders/active`;
    return await this.makeRequest(endpoint, { address });
  }

  // ========================================
  // CLASSIC SWAP (Enhanced)
  // ========================================

  /**
   * Enhanced classic swap with better error handling and features
   */
  async getEnhancedSwapQuote(params: {
    fromTokenAddress: string;
    toTokenAddress: string;
    amount: string;
    fromAddress?: string;
    slippage?: number;
    includeTokensInfo?: boolean;
    includeProtocols?: boolean;
    includeGasInfo?: boolean;
  }): Promise<Enhanced1InchSwapResult> {
    const endpoint = `/swap/v6.0/${this.chainId}/quote`;
    
    return await this.makeRequest<Enhanced1InchSwapResult>(endpoint, {
      src: params.fromTokenAddress,
      dst: params.toTokenAddress,
      amount: params.amount,
      from: params.fromAddress,
      slippage: params.slippage || 1,
      includeTokensInfo: params.includeTokensInfo || true,
      includeProtocols: params.includeProtocols || true,
      includeGasInfo: params.includeGasInfo || true,
    });
  }

  /**
   * Build enhanced swap transaction
   */
  async buildEnhancedSwapTransaction(params: {
    fromTokenAddress: string;
    toTokenAddress: string;
    amount: string;
    fromAddress: string;
    slippage?: number;
    referrer?: string;
    allowPartialFill?: boolean;
  }): Promise<Enhanced1InchSwapResult> {
    const endpoint = `/swap/v6.0/${this.chainId}/swap`;
    
    return await this.makeRequest<Enhanced1InchSwapResult>(endpoint, {
      src: params.fromTokenAddress,
      dst: params.toTokenAddress,
      amount: params.amount,
      from: params.fromAddress,
      slippage: params.slippage || 1,
      referrer: params.referrer,
      allowPartialFill: params.allowPartialFill || false,
      includeTokensInfo: true,
      includeProtocols: true,
      includeGasInfo: true,
    });
  }

  // ========================================
  // WALLET BALANCES API
  // ========================================

  /**
   * Get comprehensive wallet balances across multiple addresses
   * Perfect for portfolio analysis before execution
   */
  async getWalletBalances(params: WalletBalanceParams): Promise<WalletBalanceResult> {
    const endpoint = `/balance/v1.2/${params.chainId || this.chainId}`;
    
    return await this.makeRequest<WalletBalanceResult>(endpoint, {
      addresses: params.addresses.join(','),
    });
  }

  /**
   * Get wallet balance for specific tokens
   */
  async getTokenBalances(address: string, tokenAddresses: string[]): Promise<WalletBalanceResult> {
    const endpoint = `/balance/v1.2/${this.chainId}/${address}`;
    
    return await this.makeRequest<WalletBalanceResult>(endpoint, {
      tokens: tokenAddresses.join(','),
    });
  }

  // ========================================
  // PRICE FEEDS API
  // ========================================

  /**
   * Get real-time token prices
   * Complement to Pyth Network data
   */
  async getTokenPrices(params: PriceParams): Promise<PriceFeedResult> {
    const endpoint = `/price/v1.1/${params.chainId || this.chainId}`;
    
    return await this.makeRequest<PriceFeedResult>(endpoint, {
      tokens: params.tokens.join(','),
      currency: params.currency || 'USD',
    });
  }

  /**
   * Get historical price data
   */
  async getHistoricalPrices(tokenAddress: string, timestamp: number): Promise<any> {
    const endpoint = `/price/v1.1/${this.chainId}/historical`;
    
    return await this.makeRequest(endpoint, {
      token: tokenAddress,
      timestamp,
    });
  }

  // ========================================
  // TOKEN METADATA API
  // ========================================

  /**
   * Get comprehensive token metadata
   */
  async getTokenMetadata(tokenAddresses: string[]): Promise<TokenMetadataResult> {
    const endpoint = `/token/v1.2/${this.chainId}`;
    
    return await this.makeRequest<TokenMetadataResult>(endpoint, {
      addresses: tokenAddresses.join(','),
    });
  }

  /**
   * Search tokens by symbol or name
   */
  async searchTokens(query: string, limit: number = 10): Promise<Enhanced1InchTokenData[]> {
    const endpoint = `/token/v1.2/${this.chainId}/search`;
    
    return await this.makeRequest<Enhanced1InchTokenData[]>(endpoint, {
      query,
      limit,
    });
  }

  // ========================================
  // LIMIT ORDER PROTOCOL
  // ========================================

  /**
   * Create limit order
   */
  async createLimitOrder(params: {
    makerAsset: string;
    takerAsset: string;
    makerAmount: string;
    takerAmount: string;
    maker: string;
    expiration?: number;
  }): Promise<any> {
    const endpoint = `/orderbook/v4.0/${this.chainId}/order`;
    
    return await this.makeRequest(endpoint, params);
  }

  /**
   * Get active limit orders
   */
  async getLimitOrders(maker: string): Promise<any[]> {
    const endpoint = `/orderbook/v4.0/${this.chainId}/orders`;
    
    return await this.makeRequest(endpoint, { maker });
  }

  // ========================================
  // WEB3 API INTEGRATION
  // ========================================

  /**
   * Get gas price recommendations
   */
  async getGasPrice(): Promise<{
    standard: string;
    fast: string;
    instant: string;
  }> {
    const endpoint = `/gas-price/v1.4/${this.chainId}`;
    return await this.makeRequest(endpoint);
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txHash: string): Promise<any> {
    const endpoint = `/tx-gateway/v1.1/${this.chainId}/status/${txHash}`;
    return await this.makeRequest(endpoint);
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Switch chain ID and validate support
   */
  setChainId(chainId: number): void {
    this.chainId = chainId;
    logger.info('1inch service switched to chain', { chainId });
  }

  /**
   * Set API key for authenticated requests
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    logger.info('1inch API key configured');
  }

  /**
   * Check if Fusion is supported on current chain
   */
  isFusionSupported(): boolean {
    return this.FUSION_SUPPORTED_CHAINS.includes(this.chainId);
  }

  /**
   * Check if classic swap is supported on current chain
   */
  isClassicSwapSupported(): boolean {
    return this.CLASSIC_SWAP_CHAINS.includes(this.chainId);
  }

  /**
   * Get supported features for current chain
   */
  getSupportedFeatures(): {
    fusion: boolean;
    fusionPlus: boolean;
    classicSwap: boolean;
    limitOrders: boolean;
    priceFeeds: boolean;
    walletBalances: boolean;
  } {
    return {
      fusion: this.isFusionSupported(),
      fusionPlus: this.isFusionSupported(),
      classicSwap: this.isClassicSwapSupported(),
      limitOrders: this.isClassicSwapSupported(),
      priceFeeds: true,
      walletBalances: true,
    };
  }

  // ========================================
  // AI AGENT HELPER METHODS
  // ========================================

  /**
   * Get best swap method for given parameters
   * AI agents can use this to choose optimal execution path
   */
  async getBestSwapMethod(params: {
    fromTokenAddress: string;
    toTokenAddress: string;
    amount: string;
    fromAddress: string;
    intent: 'best_price' | 'fastest' | 'lowest_gas' | 'balanced';
    crossChain?: boolean;
    targetChainId?: number;
  }): Promise<{
    method: 'fusion' | 'fusion_plus' | 'classic';
    reasoning: string;
    quote: any;
  }> {
    const { crossChain, targetChainId, intent } = params;

    // Cross-chain scenario
    if (crossChain && targetChainId) {
      if (this.FUSION_SUPPORTED_CHAINS.includes(this.chainId) && 
          this.FUSION_SUPPORTED_CHAINS.includes(targetChainId)) {
        const quote = await this.createFusionCrossChainSwap({
          fromChainId: this.chainId,
          toChainId: targetChainId,
          fromTokenAddress: params.fromTokenAddress,
          toTokenAddress: params.toTokenAddress,
          amount: params.amount,
          fromAddress: params.fromAddress,
        });
        
        return {
          method: 'fusion_plus',
          reasoning: 'Cross-chain swap requires Fusion+ for optimal execution',
          quote,
        };
      }
    }

    // Single-chain scenarios
    if (this.isFusionSupported()) {
      // Use Fusion for better prices and MEV protection
      if (intent === 'best_price' || intent === 'balanced') {
        const quote = await this.createIntentBasedSwap({
          fromTokenAddress: params.fromTokenAddress,
          toTokenAddress: params.toTokenAddress,
          amount: params.amount,
          fromAddress: params.fromAddress,
          intent,
        });
        
        return {
          method: 'fusion',
          reasoning: `Fusion provides better ${intent} execution with MEV protection`,
          quote,
        };
      }
    }

    // Fallback to classic swap
    const quote = await this.getEnhancedSwapQuote({
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
      fromAddress: params.fromAddress,
    });

    return {
      method: 'classic',
      reasoning: 'Classic swap for immediate execution',
      quote,
    };
  }

  /**
   * Analyze portfolio before execution
   * Perfect for AI agents to make informed decisions
   */
  async analyzePortfolioForExecution(address: string): Promise<{
    totalValueUSD: number;
    topHoldings: Array<{
      symbol: string;
      balance: string;
      valueUSD: number;
      percentage: number;
    }>;
    recommendations: string[];
  }> {
    const balances = await this.getWalletBalances({ addresses: [address] });
    const userBalances = balances[address];
    
    if (!userBalances) {
      return {
        totalValueUSD: 0,
        topHoldings: [],
        recommendations: ['No tokens found in wallet'],
      };
    }

    let totalValue = 0;
    const holdings = Object.entries(userBalances).map(([tokenAddress, tokenData]) => {
      const valueUSD = tokenData.price ? 
        parseFloat(tokenData.balance) * tokenData.price.value : 0;
      totalValue += valueUSD;
      
      return {
        address: tokenAddress,
        symbol: tokenData.symbol,
        balance: tokenData.balance,
        valueUSD,
        percentage: 0, // Will calculate after total
      };
    });

    // Calculate percentages
    holdings.forEach(holding => {
      holding.percentage = totalValue > 0 ? (holding.valueUSD / totalValue) * 100 : 0;
    });

    // Sort by value and get top holdings
    const topHoldings = holdings
      .sort((a, b) => b.valueUSD - a.valueUSD)
      .slice(0, 10);

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (topHoldings.length > 0 && topHoldings[0].percentage > 70) {
      recommendations.push('Portfolio is highly concentrated - consider diversification');
    }
    
    if (totalValue < 100) {
      recommendations.push('Small portfolio size - consider gas costs for transactions');
    }
    
    if (holdings.length > 20) {
      recommendations.push('Many small positions - consider consolidation to reduce gas costs');
    }

    return {
      totalValueUSD: totalValue,
      topHoldings,
      recommendations,
    };
  }
}

export default Enhanced1InchService;
