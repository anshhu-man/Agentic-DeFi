import axios, { AxiosInstance } from 'axios';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { cache } from '@/utils/redis';

export interface CoinGeckoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
}

export interface CoinGeckoHistoricalPrice {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export interface CoinGeckoTrendingCoin {
  id: string;
  coin_id: number;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  small: string;
  large: string;
  slug: string;
  price_btc: number;
  score: number;
}

export interface CoinGeckoGlobalData {
  active_cryptocurrencies: number;
  upcoming_icos: number;
  ongoing_icos: number;
  ended_icos: number;
  markets: number;
  total_market_cap: Record<string, number>;
  total_volume: Record<string, number>;
  market_cap_percentage: Record<string, number>;
  market_cap_change_percentage_24h_usd: number;
  updated_at: number;
}

export interface DeFiProtocolData {
  id: string;
  name: string;
  symbol: string;
  tvl: number;
  tvl_change_24h: number;
  market_cap: number;
  fdv: number;
  price: number;
  price_change_24h: number;
  volume_24h: number;
  category: string;
  chains: string[];
}

export class CoinGeckoService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = config.apiKeys.coingecko || 'CG-B32bvaVYGWm8w5C4MLHvAqMS';
    this.baseURL = process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'x-cg-demo-api-key': this.apiKey,
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('CoinGecko API request', {
          url: config.url,
          method: config.method,
          params: config.params,
        });
        return config;
      },
      (error) => {
        logger.error('CoinGecko API request error', { error });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('CoinGecko API response', {
          url: response.config.url,
          status: response.status,
          dataLength: JSON.stringify(response.data).length,
        });
        return response;
      },
      (error) => {
        logger.error('CoinGecko API response error', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.get('/ping');
      return response.status === 200;
    } catch (error) {
      logger.error('CoinGecko health check failed', { error });
      return false;
    }
  }

  // Get simple token prices
  async getSimplePrices(
    tokenIds: string[],
    vsCurrencies: string[] = ['usd'],
    includeMarketCap: boolean = true,
    include24hrVol: boolean = true,
    include24hrChange: boolean = true
  ): Promise<Record<string, Record<string, number>>> {
    try {
      const cacheKey = `coingecko:simple_prices:${tokenIds.join(',')}:${vsCurrencies.join(',')}`;
      const cached = await cache.get<Record<string, Record<string, number>>>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.client.get('/simple/price', {
        params: {
          ids: tokenIds.join(','),
          vs_currencies: vsCurrencies.join(','),
          include_market_cap: includeMarketCap,
          include_24hr_vol: include24hrVol,
          include_24hr_change: include24hrChange,
        },
      });

      const prices = response.data;
      
      // Cache for 1 minute
      await cache.set(cacheKey, prices, 60);

      logger.info('Retrieved simple prices from CoinGecko', {
        tokenCount: tokenIds.length,
        currencies: vsCurrencies,
      });

      return prices;
    } catch (error) {
      logger.error('Failed to get simple prices from CoinGecko', { tokenIds, error });
      return {};
    }
  }

  // Get detailed market data for tokens
  async getMarketData(
    vsCurrency: string = 'usd',
    tokenIds?: string[],
    category?: string,
    order: string = 'market_cap_desc',
    perPage: number = 100,
    page: number = 1
  ): Promise<CoinGeckoPrice[]> {
    try {
      const cacheKey = `coingecko:market_data:${vsCurrency}:${tokenIds?.join(',') || 'all'}:${page}`;
      const cached = await cache.get<CoinGeckoPrice[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const params: any = {
        vs_currency: vsCurrency,
        order,
        per_page: perPage,
        page,
        sparkline: false,
        price_change_percentage: '24h',
      };

      if (tokenIds && tokenIds.length > 0) {
        params.ids = tokenIds.join(',');
      }

      if (category) {
        params.category = category;
      }

      const response = await this.client.get('/coins/markets', { params });
      const marketData: CoinGeckoPrice[] = response.data;

      // Cache for 2 minutes
      await cache.set(cacheKey, marketData, 120);

      logger.info('Retrieved market data from CoinGecko', {
        tokenCount: marketData.length,
        vsCurrency,
        category,
      });

      return marketData;
    } catch (error) {
      logger.error('Failed to get market data from CoinGecko', { vsCurrency, tokenIds, error });
      return [];
    }
  }

  // Get historical price data
  async getHistoricalPrices(
    tokenId: string,
    vsCurrency: string = 'usd',
    days: number = 7,
    interval?: string
  ): Promise<CoinGeckoHistoricalPrice | null> {
    try {
      const cacheKey = `coingecko:historical:${tokenId}:${vsCurrency}:${days}`;
      const cached = await cache.get<CoinGeckoHistoricalPrice>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const params: any = {
        vs_currency: vsCurrency,
        days,
      };

      if (interval) {
        params.interval = interval;
      }

      const response = await this.client.get(`/coins/${tokenId}/market_chart`, { params });
      const historicalData: CoinGeckoHistoricalPrice = response.data;

      // Cache for 5 minutes for recent data, longer for older data
      const cacheTime = days <= 1 ? 300 : days <= 7 ? 900 : 3600;
      await cache.set(cacheKey, historicalData, cacheTime);

      logger.info('Retrieved historical prices from CoinGecko', {
        tokenId,
        vsCurrency,
        days,
        dataPoints: historicalData.prices.length,
      });

      return historicalData;
    } catch (error) {
      logger.error('Failed to get historical prices from CoinGecko', { tokenId, days, error });
      return null;
    }
  }

  // Get trending coins
  async getTrendingCoins(): Promise<CoinGeckoTrendingCoin[]> {
    try {
      const cacheKey = 'coingecko:trending';
      const cached = await cache.get<CoinGeckoTrendingCoin[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.client.get('/search/trending');
      const trendingCoins: CoinGeckoTrendingCoin[] = response.data.coins.map((item: any) => item.item);

      // Cache for 10 minutes
      await cache.set(cacheKey, trendingCoins, 600);

      logger.info('Retrieved trending coins from CoinGecko', {
        count: trendingCoins.length,
      });

      return trendingCoins;
    } catch (error) {
      logger.error('Failed to get trending coins from CoinGecko', { error });
      return [];
    }
  }

  // Get global market data
  async getGlobalData(): Promise<CoinGeckoGlobalData | null> {
    try {
      const cacheKey = 'coingecko:global';
      const cached = await cache.get<CoinGeckoGlobalData>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.client.get('/global');
      const globalData: CoinGeckoGlobalData = response.data.data;

      // Cache for 5 minutes
      await cache.set(cacheKey, globalData, 300);

      logger.info('Retrieved global market data from CoinGecko', {
        totalMarketCap: globalData.total_market_cap.usd,
        marketCapChange24h: globalData.market_cap_change_percentage_24h_usd,
      });

      return globalData;
    } catch (error) {
      logger.error('Failed to get global data from CoinGecko', { error });
      return null;
    }
  }

  // Calculate volatility from historical prices
  async calculateVolatility(tokenId: string, days: number = 30): Promise<number> {
    try {
      const historicalData = await this.getHistoricalPrices(tokenId, 'usd', days);
      
      if (!historicalData || historicalData.prices.length < 2) {
        return 0;
      }

      const prices = historicalData.prices.map(([, price]) => price);
      const returns = [];

      // Calculate daily returns
      for (let i = 1; i < prices.length; i++) {
        const dailyReturn = (prices[i] - prices[i - 1]) / prices[i - 1];
        returns.push(dailyReturn);
      }

      // Calculate standard deviation (volatility)
      const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance) * 100; // Convert to percentage

      logger.info('Calculated volatility', {
        tokenId,
        days,
        volatility: volatility.toFixed(2),
      });

      return volatility;
    } catch (error) {
      logger.error('Failed to calculate volatility', { tokenId, days, error });
      return 0;
    }
  }

  // Get DeFi protocol data
  async getDeFiProtocols(category?: string): Promise<DeFiProtocolData[]> {
    try {
      const cacheKey = `coingecko:defi_protocols:${category || 'all'}`;
      const cached = await cache.get<DeFiProtocolData[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Get DeFi tokens from the decentralized-finance-defi category
      const marketData = await this.getMarketData('usd', undefined, 'decentralized-finance-defi', 'market_cap_desc', 50);
      
      const defiProtocols: DeFiProtocolData[] = marketData.map(token => ({
        id: token.id,
        name: token.name,
        symbol: token.symbol,
        tvl: token.market_cap, // Approximation - would need DeFiLlama for real TVL
        tvl_change_24h: token.market_cap_change_percentage_24h,
        market_cap: token.market_cap,
        fdv: token.fully_diluted_valuation,
        price: token.current_price,
        price_change_24h: token.price_change_percentage_24h,
        volume_24h: token.total_volume,
        category: 'DeFi',
        chains: ['ethereum'], // Would need additional API for multi-chain data
      }));

      // Cache for 5 minutes
      await cache.set(cacheKey, defiProtocols, 300);

      logger.info('Retrieved DeFi protocols from CoinGecko', {
        count: defiProtocols.length,
        category,
      });

      return defiProtocols;
    } catch (error) {
      logger.error('Failed to get DeFi protocols from CoinGecko', { category, error });
      return [];
    }
  }

  // Get token information by contract address
  async getTokenByContract(
    platform: string,
    contractAddress: string
  ): Promise<any> {
    try {
      const cacheKey = `coingecko:token_contract:${platform}:${contractAddress}`;
      const cached = await cache.get<any>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.client.get(`/coins/${platform}/contract/${contractAddress}`);
      const tokenData = response.data;

      // Cache for 10 minutes
      await cache.set(cacheKey, tokenData, 600);

      logger.info('Retrieved token by contract from CoinGecko', {
        platform,
        contractAddress,
        tokenId: tokenData.id,
      });

      return tokenData;
    } catch (error) {
      logger.error('Failed to get token by contract from CoinGecko', { platform, contractAddress, error });
      return null;
    }
  }

  // Helper method to get common DeFi token IDs
  getCommonDeFiTokenIds(): string[] {
    return [
      'ethereum',
      'usd-coin',
      'tether',
      'dai',
      'wrapped-bitcoin',
      'uniswap',
      'aave',
      'compound-governance-token',
      'maker',
      'chainlink',
      'curve-dao-token',
      'sushiswap',
      'yearn-finance',
      'synthetix-network-token',
      'balancer',
      '1inch',
      'pancakeswap-token',
      'thorchain',
      'terra-luna',
      'avalanche-2',
    ];
  }

  // Helper method to map token symbols to CoinGecko IDs
  getTokenIdBySymbol(symbol: string): string {
    const symbolMap: Record<string, string> = {
      'ETH': 'ethereum',
      'USDC': 'usd-coin',
      'USDT': 'tether',
      'DAI': 'dai',
      'WBTC': 'wrapped-bitcoin',
      'UNI': 'uniswap',
      'AAVE': 'aave',
      'COMP': 'compound-governance-token',
      'MKR': 'maker',
      'LINK': 'chainlink',
      'CRV': 'curve-dao-token',
      'SUSHI': 'sushiswap',
      'YFI': 'yearn-finance',
      'SNX': 'synthetix-network-token',
      'BAL': 'balancer',
      '1INCH': '1inch',
      'CAKE': 'pancakeswap-token',
      'RUNE': 'thorchain',
      'LUNA': 'terra-luna',
      'AVAX': 'avalanche-2',
    };

    return symbolMap[symbol.toUpperCase()] || symbol.toLowerCase();
  }
}

export default CoinGeckoService;
