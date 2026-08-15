import type { Request, Response } from 'express';
import { collectHealth } from '../services/health.service.js';

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const snapshot = await collectHealth();
  res.status(snapshot.status === 'ok' ? 200 : 503).json(snapshot);
}

export async function getReady(_req: Request, res: Response): Promise<void> {
  const snapshot = await collectHealth();
  if (snapshot.status !== 'ok') {
    res.status(503).json(snapshot);
    return;
  }
  res.status(200).json({ ready: true });
}
