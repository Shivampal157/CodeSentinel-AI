import { Router } from 'express';
import { getHealth, getReady } from '../controllers/health.controller.js';

export const healthRouter = Router();

healthRouter.get('/health', (req, res, next) => {
  void getHealth(req, res).catch(next);
});

healthRouter.get('/ready', (req, res, next) => {
  void getReady(req, res).catch(next);
});
