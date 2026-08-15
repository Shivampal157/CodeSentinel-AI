import type { Request, Response } from 'express';
import { collectHealth } from '../services/health.service.js';

/** Liveness: process is up (Railway / load balancers). Does not probe deps. */
export async function getHealth(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    status: 'ok',
    service: 'codesentinel-api',
    uptimeSec: Math.round(process.uptime()),
  });
}

/** Readiness: Mongo / Redis / Qdrant must be reachable. */
export async function getReady(_req: Request, res: Response): Promise<void> {
  const snapshot = await collectHealth();
  if (snapshot.status !== 'ok') {
    res.status(503).json(snapshot);
    return;
  }
  res.status(200).json({ ready: true, ...snapshot });
}
