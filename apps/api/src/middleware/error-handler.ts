import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'validation_error',
      details: err.flatten(),
      requestId: req.requestId,
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, requestId: req.requestId });
    return;
  }

  logger.error('unhandled error', {
    requestId: req.requestId,
    err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
  });

  res.status(500).json({ error: 'internal_error', requestId: req.requestId });
}
