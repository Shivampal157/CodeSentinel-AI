import { Router } from 'express';
import { getStats } from '../controllers/stats.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const statsRouter = Router();

statsRouter.use((req, res, next) => {
  void requireAuth(req, res, next);
});

statsRouter.get('/', (req, res, next) => {
  void getStats(req, res).catch(next);
});
