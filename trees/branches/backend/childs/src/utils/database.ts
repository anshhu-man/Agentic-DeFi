import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma || new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

const prismaAny = prisma as any;

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  prismaAny.$on('query', (e: any) => {
    logger.debug('Database Query', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  });
}

// Attach generic log listeners (avoid Prisma type narrowing issues at compile-time)
prismaAny.$on('error', (e: any) => {
  logger.error('Database Error', { error: e });
});

prismaAny.$on('info', (e: any) => {
  logger.info('Database Info', { message: e.message });
});

prismaAny.$on('warn', (e: any) => {
  logger.warn('Database Warning', { message: e.message });
});

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

export default prisma;
