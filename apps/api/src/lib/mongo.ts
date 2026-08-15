import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export async function connectMongo(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: env.NODE_ENV !== 'production',
    serverSelectionTimeoutMS: 8000,
  });
  logger.info('mongo connected', { host: mongoose.connection.host, db: mongoose.connection.name });
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}

export async function pingMongo(): Promise<number> {
  const started = Date.now();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB is not connected');
  }
  const result = await db.admin().command({ ping: 1 });
  if (result.ok !== 1) {
    throw new Error('Mongo ping failed');
  }
  return Date.now() - started;
}
