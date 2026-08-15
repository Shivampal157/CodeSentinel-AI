import type { Request, Response } from 'express';
import { collectPlatformStats } from '../services/stats.service.js';

export async function getStats(req: Request, res: Response): Promise<void> {
  const stats = await collectPlatformStats(req.user!.id);
  res.json(stats);
}
