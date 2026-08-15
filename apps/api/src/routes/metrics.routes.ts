import { Router } from 'express';
import { getMetrics } from '../controllers/metrics.controller.js';

export const metricsRouter = Router();

metricsRouter.get('/metrics', getMetrics);
