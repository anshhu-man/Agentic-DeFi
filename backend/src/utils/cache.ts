/**
 * In-memory cache replacement for Redis with a compatible API surface used in the codebase.
 * NOTE: This is process-local and non-persistent. It resets on server restart.
 */
type CacheValue = {
  v: string;       // JSON stringified
  exp?: number;    // epoch ms expiry
};

class MemoryCache {
  private store = new Map<string, CacheValue>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.exp && Date.now() > entry.exp) {
      this.store.delete(key);
      return null;
    }
    try {
      return JSON.parse(entry.v) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const exp = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { v: serialized, exp });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.exp && Date.now() > entry.exp) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  async flushAll(): Promise<void> {
    this.store.clear();
  }

  // Key generators used across the codebase
  keys = {
    priceData: (symbol: string) => `price:${symbol}`,
    userPortfolio: (userId: string, chainId: number) => `portfolio:${userId}:${chainId}`,
    yieldOpportunities: (chainId: number) => `yield:${chainId}`,
    governanceProposals: (daoAddress: string) => `governance:${daoAddress}`,
    queryResult: (queryHash: string) => `query:${queryHash}`,
    userSession: (userId: string) => `session:${userId}`,
  };
}

export const cache = new MemoryCache();
export default cache;
