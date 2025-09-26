import { logger } from './logger';

// Simple Redis connection stub since Redis is not available
export const connectRedis = async (): Promise<void> => {
  throw new Error('Redis is not configured');
};

export const redis = {
  get: async (key: string): Promise<string | null> => {
    logger.warn('Redis not available, returning null for key:', key);
    return null;
  },
  set: async (key: string, value: string, ttl?: number): Promise<void> => {
    logger.warn('Redis not available, cannot set key:', key);
  },
  del: async (key: string): Promise<void> => {
    logger.warn('Redis not available, cannot delete key:', key);
  },
  ping: async (): Promise<string> => {
    throw new Error('Redis not available');
  }
};

export default redis;
