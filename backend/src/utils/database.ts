import { logger } from './logger';

// Mock Prisma Client for testing purposes
class MockPrismaClient {
  constructor() {
    logger.info('Using Mock Prisma Client for testing');
  }

  // Mock methods that might be used
  $on(event: string, callback: Function) {
    // Mock event listener
  }

  $connect() {
    return Promise.resolve();
  }

  $disconnect() {
    return Promise.resolve();
  }
}

// Create mock prisma instance
export const prisma = new MockPrismaClient() as any;

// Mock the default export as well
export default prisma;
