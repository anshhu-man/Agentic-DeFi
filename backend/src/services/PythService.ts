import axios from 'axios';
import { HermesClient } from '@pythnetwork/hermes-client';
import { config, PRICE_FEED_IDS } from '../config';
import { logger } from '../utils/logger';
import { cache } from '../utils/cache';
import { PriceData, PythPriceData } from '../types';

export class PythService {
  private baseUrl: string;
  private priceFeeds: Map<string, string> = new Map();
  private hermes!: HermesClient;

  constructor() {
    this.baseUrl = config.pyth.endpoint;
    this.hermes = new HermesClient(this.baseUrl);
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
        .map((symbol) =>
          this.priceFeeds.get(symbol) ||
          this.priceFeeds.get(`${String(symbol).toUpperCase().split('/')[0]}/USD`)
        )
        .filter(Boolean) as string[];

      if (feedIds.length === 0) {
        logger.warn('No valid price feed IDs found for symbols', { symbols });
        return [];
      }

      let feeds: any[] = [];
      try {
        const response = await this.hermes.getLatestPriceUpdates(feedIds, { parsed: true });
        feeds = Array.isArray((response as any)?.parsed)
          ? (response as any).parsed
          : Array.isArray((response as any)?.updates)
          ? (response as any).updates
          : Array.isArray(response as any)
          ? (response as any)
          : [];
        logger.info('Pyth Hermes response received', {
          requestedIds: feedIds,
          parsedCount: Array.isArray(feeds) ? feeds.length : null,
        });
      } catch (e: any) {
        logger.warn('Hermes SDK getLatestPriceUpdates failed', {
          status: (e as any)?.response?.status,
          data: (e as any)?.response?.data,
          message: (e as any)?.message || 'unknown',
        });
        feeds = [];
      }

      const priceData: PriceData[] = [];

      for (const feed of feeds) {
        const symbol = this.getFeedSymbol(feed.id);
        if (!symbol) {
          logger.warn('Pyth feed id not mapped to symbol', { feedId: feed.id });
          continue;
        }
        if (feed.price) {
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

      // Fallback: if SDK returned no feeds, try legacy Hermes v1 latest_price_feeds
      if (priceData.length === 0) {
        try {
          // Attempt 1: ids[] repeated params
          const u1 = new URL(`${this.baseUrl}/api/latest_price_feeds`);
          for (const id of feedIds) {
            u1.searchParams.append('ids[]', id);
          }
          const resp1 = await axios.get(u1.toString(), {
            timeout: 10000,
            headers: { Accept: 'application/json' },
          });
          const arr1: any[] = Array.isArray(resp1.data)
            ? resp1.data
            : Array.isArray(resp1.data?.data)
            ? resp1.data.data
            : [];

          for (const feed of arr1) {
            const symbol = this.getFeedSymbol(feed.id);
            if (!symbol || !feed?.price) continue;

            const price = this.formatPrice(feed.price.price, feed.price.expo);
            priceData.push({
              symbol,
              price,
              change24h: '0',
              volume24h: '0',
              timestamp: new Date(
                (feed.price.publish_time || Math.floor(Date.now() / 1000)) * 1000
              ),
            });

            // cache 30s
            const cacheKey = cache.keys.priceData(symbol);
            await cache.set(
              cacheKey,
              {
                symbol,
                price,
                change24h: '0',
                volume24h: '0',
                timestamp: new Date(),
              },
              30
            );
          }

          // Attempt 2: if still empty, try ids as a single non-array param
          if (priceData.length === 0) {
            const resp2 = await axios.get(`${this.baseUrl}/api/latest_price_feeds`, {
              params: { ids: feedIds },
              timeout: 10000,
              headers: { Accept: 'application/json' },
            });
            const arr2: any[] = Array.isArray(resp2.data)
              ? resp2.data
              : Array.isArray(resp2.data?.data)
              ? resp2.data.data
              : [];

            for (const feed of arr2) {
              const symbol = this.getFeedSymbol(feed.id);
              if (!symbol || !feed?.price) continue;

              const price = this.formatPrice(feed.price.price, feed.price.expo);
              priceData.push({
                symbol,
                price,
                change24h: '0',
                volume24h: '0',
                timestamp: new Date(
                  (feed.price.publish_time || Math.floor(Date.now() / 1000)) * 1000
                ),
              });

              const cacheKey = cache.keys.priceData(symbol);
              await cache.set(
                cacheKey,
                {
                  symbol,
                  price,
                  change24h: '0',
                  volume24h: '0',
                  timestamp: new Date(),
                },
                30
              );
            }
          }
        } catch (fallbackErr) {
          logger.warn('Hermes v1 latest_price_feeds fallback failed', {
            error:
              (fallbackErr as any)?.response?.status ||
              (fallbackErr as any)?.message ||
              'unknown',
          });
        }
      }

      logger.info('Retrieved real-time prices', {
        symbolCount: symbols.length,
        priceCount: priceData.length,
      });

      return priceData;
    } catch (error: any) {
      logger.error('Failed to get real-time prices', {
        symbols,
        status: (error as any)?.response?.status,
        data: (error as any)?.response?.data,
        message: (error as any)?.message || String(error),
      });
      
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

      const historyBase = (config as any).pyth?.history?.endpoint || this.baseUrl;
      const historyHeaders = this.buildHistoryHeaders();

      // Try Hermes v2 time-series endpoints with multiple param variants
      const id0x = feedId.toLowerCase().startsWith('0x') ? feedId.toLowerCase() : `0x${feedId.toLowerCase()}`;
      const idNo0x = id0x.replace(/^0x/, '');

      type Candidate = { url: string; params: Record<string, any> };
      const candidates: Candidate[] = [
        {
          url: `${historyBase}/v2/updates/price/history`,
          params: { 'ids[]': id0x, from_time: startTime, to_time: endTime, parsed: true },
        },
        {
          url: `${historyBase}/v2/updates/price/history`,
          params: { 'ids[]': id0x, start_time: startTime, end_time: endTime, parsed: true },
        },
        {
          url: `${historyBase}/v2/updates/price/history`,
          params: { ids: id0x, from_time: startTime, to_time: endTime, parsed: true },
        },
        {
          url: `${historyBase}/v2/updates/price/history`,
          params: { 'ids[]': `0x${idNo0x}`, from_time: startTime, to_time: endTime, parsed: true },
        },
      ];

      let parsed: any[] = [];
      let lastErr: any = null;

      for (const c of candidates) {
        try {
          const resp = await axios.get(c.url, {
            params: c.params,
            timeout: 15000,
            headers: historyHeaders,
          });

          parsed = Array.isArray((resp.data as any)?.parsed)
            ? (resp.data as any).parsed
            : Array.isArray((resp.data as any)?.updates)
            ? (resp.data as any).updates
            : Array.isArray(resp.data)
            ? (resp.data as any)
            : [];

          if (Array.isArray(parsed) && parsed.length > 0) {
            logger.info('Historical v2 fetch succeeded', {
              symbol,
              url: c.url,
              params: Object.keys(c.params),
              points: parsed.length,
            });
            break;
          }
        } catch (e: any) {
          lastErr = e?.response?.status || e?.message || 'unknown';
          continue;
        }
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        // Try POST variants to v2 history
        const postBodies: any[] = [
          { ids: [id0x], from_time: startTime, to_time: endTime, parsed: true },
          { ids: [id0x], start_time: startTime, end_time: endTime, parsed: true },
          { ids: id0x, from_time: startTime, to_time: endTime, parsed: true },
          { ids: [`0x${idNo0x}`], from_time: startTime, to_time: endTime, parsed: true },
        ];
        for (const body of postBodies) {
          try {
            const resp = await axios.post(`${historyBase}/v2/updates/price/history`, body, {
              timeout: 15000,
              headers: historyHeaders,
            });
            parsed = Array.isArray((resp.data as any)?.parsed)
              ? (resp.data as any).parsed
              : Array.isArray((resp.data as any)?.updates)
              ? (resp.data as any).updates
              : Array.isArray(resp.data)
              ? (resp.data as any)
              : [];

            if (Array.isArray(parsed) && parsed.length > 0) {
              logger.info('Historical v2 POST fetch succeeded', {
                symbol,
                keys: Object.keys(body),
                points: parsed.length,
              });
              break;
            }
          } catch (e: any) {
            lastErr = e?.response?.status || e?.message || 'unknown';
            continue;
          }
        }
      }

      // TradingView shim fallback if still empty
      if (!Array.isArray(parsed) || parsed.length === 0) {
        try {
          const tfToRes: Record<string, number> = { '1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440 };
          const resolution = tfToRes[timeframe] ?? 60;

          const tryShim = async (symParam: string) => {
            const shimResp = await axios.get(`${historyBase}/v2/shims/tradingview/history`, {
              params: { symbol: symParam, resolution, from: startTime, to: endTime },
              timeout: 15000,
              headers: historyHeaders,
            });
            return shimResp.data;
          };

          let sh = await tryShim(id0x);
          if (!(sh && sh.s === 'ok' && Array.isArray(sh.t) && Array.isArray(sh.c) && sh.t.length > 0)) {
            sh = await tryShim(idNo0x);
          }

          if (sh && sh.s === 'ok' && Array.isArray(sh.t) && Array.isArray(sh.c) && sh.t.length > 0) {
            const historicalData = sh.t.map((ts: number, i: number) => ({
              timestamp: new Date(ts * 1000),
              price: String(sh.c[i]),
            }));
            logger.info('Historical TradingView shim fetch succeeded', {
              symbol,
              points: historicalData.length,
              resolution,
            });
            return historicalData;
          }
        } catch (e: any) {
          lastErr = e?.response?.status || e?.message || 'unknown';
        }
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error(`PYTH_V2_HISTORY_FAILED: ${lastErr || 'no data'}`);
      }

      const historicalData = parsed.map((item: any) => {
        const p = item?.price ?? item;
        const ts = p?.publish_time ?? item?.publish_time;
        const pr = p?.price ?? item?.price;
        const ex = p?.expo ?? item?.expo ?? 0;

        return {
          timestamp: typeof ts === 'number' ? new Date(ts * 1000) : new Date(),
          price: this.formatPrice(String(pr), Number(ex)),
        };
      });

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
    const norm = feedId.toLowerCase().replace(/^0x/, '');
    for (const [symbol, id] of this.priceFeeds) {
      const normId = id.toLowerCase().replace(/^0x/, '');
      if (normId === norm) {
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

  private buildHistoryHeaders(): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const h = (config as any).pyth?.history?.apiKeyHeader;
    const k = (config as any).pyth?.history?.apiKey;
    if (h && k) headers[h] = k;
    return headers;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.hermes.getLatestPriceUpdates([PRICE_FEED_IDS['ETH/USD']]);
      const feeds = (response as any)?.parsed || [];
      return Array.isArray(feeds) && feeds.length > 0;
    } catch (error) {
      logger.error('Pyth service health check failed', { error });
      return false;
    }
  }

  // Method for fetching Hermes update data for on-chain updates
  async fetchHermesUpdateForOnChain(feedIds: string[]): Promise<string[]> {
    try {
      logger.info('Fetching Hermes update for on-chain', { feedIds });
      
      const response = await axios.get(`${this.baseUrl}/v2/updates/price/latest`, {
        params: {
          'ids[]': feedIds,
          encoding: 'hex'
        },
        timeout: 15000,
        headers: { Accept: 'application/json' }
      });

      const data = response.data;
      const updateData: string[] = [];
      const updates = Array.isArray(data?.updates) ? data.updates : [];

      // Prefer v2 hex encoding: updates: [ "..." ] (no 0x)
      for (const u of updates) {
        if (typeof u === 'string' && u.length > 0) {
          updateData.push('0x' + u.replace(/^0x/, ''));
          continue;
        }
        // Fallback object shapes
        if (u && typeof u === 'object') {
          if (typeof (u as any).data === 'string') {
            updateData.push('0x' + String((u as any).data).replace(/^0x/, ''));
            continue;
          }
          if ((u as any).binary && typeof (u as any).binary.data === 'string') {
            updateData.push('0x' + String((u as any).binary.data).replace(/^0x/, ''));
            continue;
          }
        }
      }

      // Root-level binary fallback: { binary: { data: [ "...hex..." ] } }
      if (updateData.length === 0 && data?.binary?.data) {
        if (Array.isArray(data.binary.data) && data.binary.data.length > 0) {
          updateData.push('0x' + String(data.binary.data[0]).replace(/^0x/, ''));
        } else if (typeof data.binary.data === 'string') {
          updateData.push('0x' + String(data.binary.data).replace(/^0x/, ''));
        }
      }

      logger.info('Successfully fetched Hermes update data', {
        feedIds,
        updateCount: updateData.length
      });

      return updateData;
    } catch (error: any) {
      logger.error('Failed to fetch Hermes update for on-chain', {
        feedIds,
        error: error?.message || 'Unknown error'
      });
      return [];
    }
  }

  // Method for formatting on-chain price data
  formatOnChainPrice(priceData: {
    price: string;
    confidence: string;
    expo: number;
    publishTime: number;
  }): {
    price18: string;
    confidence18: string;
    publishTime: Date;
  } {
    const price18 = this.formatPrice(priceData.price, priceData.expo);
    const confidence18 = this.formatPrice(priceData.confidence, priceData.expo);
    
    return {
      price18,
      confidence18,
      publishTime: new Date(priceData.publishTime * 1000)
    };
  }

  // Method for validating price confidence
  async validatePriceConfidence(
    price: string,
    confidence: string,
    expo: number,
    maxConfBps: number
  ): Promise<boolean> {
    try {
      const priceValue = parseFloat(this.formatPrice(price, expo));
      const confidenceValue = parseFloat(this.formatPrice(confidence, expo));
      
      if (priceValue === 0) {
        return false;
      }
      
      const confidenceRatio = (confidenceValue / Math.abs(priceValue)) * 10000; // Convert to basis points
      
      return confidenceRatio <= maxConfBps;
    } catch (error) {
      logger.error('Failed to validate price confidence', { error });
      return false;
    }
  }
}

export default PythService;
