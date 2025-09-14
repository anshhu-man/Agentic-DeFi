import axios from 'axios';
import { config, PRICE_FEED_IDS } from '@/config';
import { logger } from '@/utils/logger';
import { cache } from '@/utils/redis';
import { PriceData, PythPriceData } from '@/types';

export class PythService {
  private baseUrl: string;
  private priceFeeds: Map<string, string> = new Map();

  constructor() {
    this.baseUrl = config.pyth.endpoint;
    this.initializePriceFeeds();
  }

  private initializePriceFeeds(): void {
    Object.entries(PRICE_FEED_IDS).forEach(([symbol, feedId]) => {
      this.priceFeeds.set(symbol, feedId);
    });
    
    logger.info('Initialized Pyth price feeds', { 
      feedCount: this.priceFeeds.size 
    });
  }

  async getRealTimePrices(symbols: string[]): Promise<PriceData[]> {
    try {
      const feedIds = symbols
        .map(symbol => this.priceFeeds.get(symbol))
        .filter(Boolean) as string[];

      if (feedIds.length === 0) {
        logger.warn('No valid price feed IDs found for symbols', { symbols });
        return [];
      }

      const response = await axios.get(`${this.baseUrl}/api/latest_price_feeds`, {
        params: {
          ids: feedIds,
        },
        timeout: 10000,
      });

      const priceData: PriceData[] = [];

      for (const feed of response.data) {
        const symbol = this.getFeedSymbol(feed.id);
        if (symbol && feed.price) {
          const price = this.formatPrice(feed.price.price, feed.price.expo);
          const change24h = '0'; // Pyth doesn't provide 24h change directly
          
          priceData.push({
            symbol,
            price,
            change24h,
            volume24h: '0', // Not available from Pyth
            timestamp: new Date(feed.price.publish_time * 1000),
          });

          // Cache the price data for 30 seconds
          const cacheKey = cache.keys.priceData(symbol);
          await cache.set(cacheKey, {
            symbol,
            price,
            change24h,
            volume24h: '0',
            timestamp: new Date(),
          }, 30);
        }
      }

      logger.info('Retrieved real-time prices', { 
        symbolCount: symbols.length,
        priceCount: priceData.length 
      });

      return priceData;
    } catch (error) {
      logger.error('Failed to get real-time prices', { symbols, error });
      
      // Try to return cached data as fallback
      const cachedPrices: PriceData[] = [];
      for (const symbol of symbols) {
        const cacheKey = cache.keys.priceData(symbol);
        const cached = await cache.get<PriceData>(cacheKey);
        if (cached) {
          cachedPrices.push(cached);
        }
      }
      
      return cachedPrices;
    }
  }

  async getHistoricalPrices(
    symbol: string, 
    timeframe: string = '1h',
    limit: number = 100
  ): Promise<Array<{ timestamp: Date; price: string }>> {
    try {
      const feedId = this.priceFeeds.get(symbol);
      if (!feedId) {
        throw new Error(`No price feed found for symbol: ${symbol}`);
      }

      // Calculate time range based on timeframe
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = this.calculateStartTime(endTime, timeframe, limit);

      const response = await axios.get(`${this.baseUrl}/api/get_price_feed`, {
        params: {
          id: feedId,
          start_time: startTime,
          end_time: endTime,
        },
        timeout: 15000,
      });

      const historicalData = response.data.map((item: any) => ({
        timestamp: new Date(item.publish_time * 1000),
        price: this.formatPrice(item.price, item.expo),
      }));

      logger.info('Retrieved historical prices', { 
        symbol, 
        timeframe, 
        dataPoints: historicalData.length 
      });

      return historicalData;
    } catch (error) {
      logger.error('Failed to get historical prices', { symbol, timeframe, error });
      return [];
    }
  }

  async calculateVolatility(symbol: string, period: number = 24): Promise<number> {
    try {
      const historicalPrices = await this.getHistoricalPrices(symbol, '1h', period);
      
      if (historicalPrices.length < 2) {
        return 0;
      }

      const prices = historicalPrices.map(item => parseFloat(item.price));
      const returns = [];

      // Calculate returns
      for (let i = 1; i < prices.length; i++) {
        const returnValue = (prices[i] - prices[i - 1]) / prices[i - 1];
        returns.push(returnValue);
      }

      // Calculate standard deviation (volatility)
      const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance) * 100; // Convert to percentage

      logger.info('Calculated volatility', { symbol, period, volatility });

      return volatility;
    } catch (error) {
      logger.error('Failed to calculate volatility', { symbol, period, error });
      return 0;
    }
  }

  async setupPriceAlerts(conditions: Array<{
    symbol: string;
    threshold: string;
    comparison: 'above' | 'below';
    callback: (price: PriceData) => void;
  }>): Promise<void> {
    try {
      // In a real implementation, this would set up WebSocket connections
      // or polling mechanisms to monitor price changes
      logger.info('Setting up price alerts', { alertCount: conditions.length });

      for (const condition of conditions) {
        // Store alert conditions in cache or database
        const alertKey = `alert:${condition.symbol}:${condition.threshold}:${condition.comparison}`;
        await cache.set(alertKey, condition, 3600); // 1 hour TTL
      }
    } catch (error) {
      logger.error('Failed to setup price alerts', { error });
    }
  }

  async getPriceCorrelation(symbol1: string, symbol2: string, period: number = 30): Promise<number> {
    try {
      const [prices1, prices2] = await Promise.all([
        this.getHistoricalPrices(symbol1, '1h', period),
        this.getHistoricalPrices(symbol2, '1h', period),
      ]);

      if (prices1.length !== prices2.length || prices1.length < 2) {
        return 0;
      }

      const values1 = prices1.map(p => parseFloat(p.price));
      const values2 = prices2.map(p => parseFloat(p.price));

      const correlation = this.calculateCorrelation(values1, values2);

      logger.info('Calculated price correlation', { symbol1, symbol2, correlation });

      return correlation;
    } catch (error) {
      logger.error('Failed to calculate price correlation', { symbol1, symbol2, error });
      return 0;
    }
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private formatPrice(price: string, expo: number): string {
    const priceNumber = parseInt(price);
    const formattedPrice = priceNumber * Math.pow(10, expo);
    return formattedPrice.toString();
  }

  private getFeedSymbol(feedId: string): string | null {
    for (const [symbol, id] of this.priceFeeds) {
      if (id === feedId) {
        return symbol;
      }
    }
    return null;
  }

  private calculateStartTime(endTime: number, timeframe: string, limit: number): number {
    const intervals: Record<string, number> = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '4h': 14400,
      '1d': 86400,
    };

    const intervalSeconds = intervals[timeframe] || 3600;
    return endTime - (intervalSeconds * limit);
  }

  async getMultipleTokenPrices(symbols: string[]): Promise<Map<string, string>> {
    const prices = new Map<string, string>();
    
    try {
      const priceData = await this.getRealTimePrices(symbols);
      
      for (const data of priceData) {
        prices.set(data.symbol, data.price);
      }
      
      return prices;
    } catch (error) {
      logger.error('Failed to get multiple token prices', { symbols, error });
      return prices;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/latest_price_feeds`, {
        params: { ids: [PRICE_FEED_IDS['ETH/USD']] },
        timeout: 5000,
      });
      
      return response.status === 200 && response.data.length > 0;
    } catch (error) {
      logger.error('Pyth service health check failed', { error });
      return false;
    }
  }
}

export default PythService;
