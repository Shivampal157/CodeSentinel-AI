import winston from 'winston';
import { env } from '../config/env.js';

const pretty = winston.format.printf(({ level, message, timestamp, service, ...rest }) => {
  const extra = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
  return `${timestamp} [${service ?? 'worker'}] ${level}: ${message}${extra}`;
});

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: 'worker' },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), pretty),
  ),
  transports: [new winston.transports.Console()],
});
