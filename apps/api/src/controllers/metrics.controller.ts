import type { Request, Response } from 'express';
import { renderPrometheusMetrics } from '../lib/metrics.js';

export function getMetrics(_req: Request, res: Response): void {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.status(200).send(renderPrometheusMetrics());
}
