import { RateLimiterRedis } from 'rate-limiter-flexible';
import type { NextFunction, Request, Response } from 'express';
import { redis } from '../lib/redis.js';
import { HttpError } from './error-handler.js';
import { logger } from '../lib/logger.js';

const limiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:api',
  points: 120,
  duration: 60,
});

export async function rateLimit(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const key = req.user?.id ?? req.ip ?? 'anonymous';
  try {
    await limiter.consume(key);
    next();
  } catch {
    logger.warn('rate limit exceeded', { key, path: req.originalUrl });
    next(new HttpError(429, 'rate_limit_exceeded'));
  }
}
