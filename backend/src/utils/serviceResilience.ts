import { logger } from './logger';

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

/**
 * Circuit breaker configuration
 */
interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

/**
 * Circuit breaker implementation for service resilience
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttempt: number = 0;

  constructor(
    private serviceName: string,
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 10000, // 10 seconds
    }
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit breaker is OPEN for ${this.serviceName}`);
      }
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
    logger.info(`Circuit breaker reset for ${this.serviceName}`);
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.recoveryTimeout;
      logger.warn(`Circuit breaker opened for ${this.serviceName}`, {
        failureCount: this.failureCount,
        nextAttempt: new Date(this.nextAttempt),
      });
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
    };
  }
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Exponential backoff retry utility
 */
export class RetryHandler {
  constructor(
    private config: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
    }
  ) {}

  async execute<T>(
    operation: () => Promise<T>,
    shouldRetry: (error: any) => boolean = () => true
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === this.config.maxAttempts || !shouldRetry(error)) {
          throw error;
        }

        const delay = Math.min(
          this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1),
          this.config.maxDelay
        );

        logger.warn(`Retry attempt ${attempt}/${this.config.maxAttempts} after ${delay}ms`, {
          error: error instanceof Error ? error.message : String(error),
        });

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Service health monitor
 */
export class ServiceHealthMonitor {
  private healthStatus: Map<string, boolean> = new Map();
  private lastHealthCheck: Map<string, number> = new Map();

  constructor(private checkInterval: number = 30000) {}

  async checkHealth(
    serviceName: string,
    healthCheck: () => Promise<boolean>
  ): Promise<boolean> {
    const now = Date.now();
    const lastCheck = this.lastHealthCheck.get(serviceName) || 0;

    // Use cached result if within check interval
    if (now - lastCheck < this.checkInterval && this.healthStatus.has(serviceName)) {
      return this.healthStatus.get(serviceName)!;
    }

    try {
      const isHealthy = await healthCheck();
      this.healthStatus.set(serviceName, isHealthy);
      this.lastHealthCheck.set(serviceName, now);

      logger.info(`Health check for ${serviceName}`, { isHealthy });
      return isHealthy;
    } catch (error) {
      logger.error(`Health check failed for ${serviceName}`, { error });
      this.healthStatus.set(serviceName, false);
      this.lastHealthCheck.set(serviceName, now);
      return false;
    }
  }

  getHealthStatus(serviceName: string): boolean | undefined {
    return this.healthStatus.get(serviceName);
  }

  getAllHealthStatus(): Record<string, boolean> {
    return Object.fromEntries(this.healthStatus);
  }
}

/**
 * Fallback data provider for when services are unavailable
 */
export class FallbackDataProvider {
  private static mockPriceData = {
    'ETH/USD': '2500.00',
    'BTC/USD': '45000.00',
    'USDC/USD': '1.00',
    'USDT/USD': '1.00',
    'DAI/USD': '1.00',
    'MATIC/USD': '0.80',
  };

  private static mockPoolData = [
    {
      id: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
      token0: { id: '0xa0b86a33e6441b8435b662303c0f098c8c5c0f8e', symbol: 'USDC', decimals: '6' },
      token1: { id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', symbol: 'WETH', decimals: '18' },
      feeTier: '500',
      liquidity: '1000000000000000000',
      sqrtPrice: '1771845812700903892492492442',
      tick: '201240',
      tvlUSD: '100000000',
      volumeUSD: '50000000',
    },
    {
      id: '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8',
      token0: { id: '0xa0b86a33e6441b8435b662303c0f098c8c5c0f8e', symbol: 'USDC', decimals: '6' },
      token1: { id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', symbol: 'WETH', decimals: '18' },
      feeTier: '3000',
      liquidity: '800000000000000000',
      sqrtPrice: '1771845812700903892492492442',
      tick: '201240',
      tvlUSD: '80000000',
      volumeUSD: '30000000',
    },
  ];

  private static mockLendingRates = [
    {
      asset: 'USDC',
      supplyRate: '0.045',
      borrowRate: '0.065',
      totalSupply: '1000000000',
      totalBorrow: '600000000',
      utilizationRate: '60',
    },
    {
      asset: 'USDT',
      supplyRate: '0.042',
      borrowRate: '0.062',
      totalSupply: '800000000',
      totalBorrow: '480000000',
      utilizationRate: '60',
    },
  ];

  static getPriceData(symbol: string): string {
    return this.mockPriceData[symbol as keyof typeof this.mockPriceData] || '0';
  }

  static getPoolData() {
    return this.mockPoolData;
  }

  static getLendingRates() {
    return this.mockLendingRates;
  }

  static getHistoricalPrices(symbol: string, points: number = 24) {
    const basePrice = parseFloat(this.getPriceData(symbol));
    const data = [];
    const now = Date.now();

    for (let i = points - 1; i >= 0; i--) {
      const timestamp = new Date(now - i * 3600000); // 1 hour intervals
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      const price = (basePrice * (1 + variation)).toFixed(2);
      
      data.push({
        timestamp,
        price,
      });
    }

    return data;
  }
}

export { CircuitState };
