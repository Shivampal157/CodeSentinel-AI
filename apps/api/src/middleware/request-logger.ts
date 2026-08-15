import type { NextFunction, Request, Response } from 'express';
import { recordHttpRequest } from '../lib/metrics.js';
import { logger } from '../lib/logger.js';

function normalizeRoute(path: string): string {
  return path
    .replace(/\/[a-f0-9]{24}/gi, '/:id')
    .replace(/\/\d+/g, '/:num')
    .split('?')[0] ?? path;
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - started;
    const route = normalizeRoute(req.route?.path ? `/api${req.route.path}` : req.path);
    recordHttpRequest(req.method, route, res.statusCode, durationMs);
    logger.http('request', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
    });
  });
  next();
}
