import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { rateLimit } from './middleware/rate-limit.js';
import { requestId } from './middleware/request-id.js';
import { requestLogger } from './middleware/request-logger.js';
import { authRouter } from './routes/auth.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { metricsRouter } from './routes/metrics.routes.js';
import { statsRouter } from './routes/stats.routes.js';
import {
  commentRouter,
  prRouter,
  reviewRouter,
} from './routes/pull-request.routes.js';
import { repoRouter } from './routes/repository.routes.js';

export function createApp() {
  const app = express();

  if (env.TRUST_PROXY) {
    app.set('trust proxy', 1);
  }

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(requestId);
  app.use(requestLogger);
  // Railway default healthcheck hits `/` unless path is overridden.
  app.get('/', (_req, res) => {
    res.status(200).json({ ok: true, service: 'codesentinel-api' });
  });
  app.use('/api', healthRouter);
  app.use((req, res, next) => {
    void rateLimit(req, res, next);
  });
  app.use('/api', metricsRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/repos', repoRouter);
  app.use('/api/pull-requests', prRouter);
  app.use('/api/reviews', reviewRouter);
  app.use('/api/comments', commentRouter);

  app.use(errorHandler);
  return app;
}
