import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import type { RequestHandler } from 'express';
import { config } from '../config';

let redisStore: any = null;

async function initRedisStore(): Promise<void> {
  try {
    const { Redis } = await import('ioredis');
    const RedisStoreModule = await import('rate-limit-redis');
    const RedisStore = RedisStoreModule.default;

    const client = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null,
      lazyConnect: true,
    });

    client.on('error', () => {});

    await client.connect();

    redisStore = new RedisStore({
      sendCommand: function () {
        return client.call.apply(client, arguments as any);
      },
    } as any);

    console.log('Rate limiter: Redis store connected');
  } catch {
    console.log('Rate limiter: using memory store (Redis not available)');
  }
}

initRedisStore().catch(() => {});

export function hasRedisStore(): boolean {
  return redisStore !== null;
}

function limiterOptions(extra: Record<string, any> = {}) {
  return {
    standardHeaders: true,
    legacyHeaders: false,
    ...extra,
  };
}

export const generalLimiter = rateLimit(limiterOptions({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
}));

export const aiLimiter = rateLimit(limiterOptions({
  windowMs: 24 * 60 * 60 * 1000,
  max: 50,
  message: { error: 'Daily AI request limit reached. Try again tomorrow.' },
}));

export const authLimiter = rateLimit(limiterOptions({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts, please try again later' },
}));

export const slowDownLimiter: RequestHandler = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 30,
  delayMs: (hits: number) => (hits - 30) * 100,
  maxDelayMs: 2000,
  validate: { delayMs: false },
});
