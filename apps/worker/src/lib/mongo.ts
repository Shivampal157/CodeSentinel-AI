import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export async function connectMongo(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  logger.info('worker mongo connected', { db: mongoose.connection.name });
}
