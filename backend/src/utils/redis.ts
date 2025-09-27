/**
 * Redis has been removed from the project.
 * This module remains only as a no-op placeholder to avoid import errors in legacy code.
 */
export const connectRedis = async (): Promise<void> => {
  // No-op
  return;
};

export const redis = {
  get: async (_key: string): Promise<string | null> => null,
  set: async (_key: string, _value: string, _ttl?: number): Promise<void> => {},
  del: async (_key: string): Promise<void> => {},
  ping: async (): Promise<string> => 'pong',
};

export default redis;
