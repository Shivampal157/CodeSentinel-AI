import { createAdapter } from '@socket.io/redis-adapter';
import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { verifyAccessToken } from '../services/token.service.js';

let io: Server | null = null;

export function getIo(): Server | null {
  return io;
}

export async function initSocketServer(httpServer: HttpServer): Promise<Server> {
  const pubClient = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);

  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    },
    adapter: createAdapter(pubClient, subClient),
  });

  io.use((socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.headers.authorization?.startsWith('Bearer ')
          ? socket.handshake.headers.authorization.slice(7)
          : undefined);
      if (!token) {
        next(new Error('unauthorized'));
        return;
      }
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.login = payload.login;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    logger.info('socket connected', { userId: socket.data.userId, sid: socket.id });

    socket.on('join:pr', (pullRequestId: string) => {
      if (typeof pullRequestId !== 'string' || pullRequestId.length < 1) return;
      void socket.join(`pr:${pullRequestId}`);
      logger.debug('socket joined pr room', { pullRequestId, sid: socket.id });
    });

    socket.on('leave:pr', (pullRequestId: string) => {
      if (typeof pullRequestId !== 'string') return;
      void socket.leave(`pr:${pullRequestId}`);
    });

    socket.on('join:repo', (repositoryId: string) => {
      if (typeof repositoryId !== 'string') return;
      void socket.join(`repo:${repositoryId}`);
    });

    socket.on('disconnect', () => {
      logger.debug('socket disconnected', { sid: socket.id });
    });
  });

  logger.info('socket.io ready with redis adapter');
  return io;
}

export async function closeSocketServer(): Promise<void> {
  if (!io) return;
  await new Promise<void>((resolve) => {
    io!.close(() => resolve());
  });
  io = null;
}
