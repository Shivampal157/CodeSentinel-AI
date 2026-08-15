import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { REDIS_KEYS } from '@codesentinel/shared';
import { env } from '../config/env.js';
import { redis } from '../lib/redis.js';

export type AccessTokenPayload = {
  sub: string;
  login: string;
  typ: 'access';
};

export type RefreshTokenPayload = {
  sub: string;
  login: string;
  jti: string;
  typ: 'refresh';
};

function ttlToSeconds(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) return 60 * 60 * 24 * 7;
  const value = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    default:
      return value;
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(userId: string, login: string): string {
  const payload: AccessTokenPayload = { sub: userId, login, typ: 'access' };
  const options: SignOptions = { expiresIn: ttlToSeconds(env.JWT_ACCESS_TTL) };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export async function issueRefreshToken(userId: string, login: string): Promise<string> {
  const jti = randomUUID();
  const payload: RefreshTokenPayload = { sub: userId, login, jti, typ: 'refresh' };
  const ttl = ttlToSeconds(env.JWT_REFRESH_TTL);
  const options: SignOptions = { expiresIn: ttl };
  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
  await redis.set(REDIS_KEYS.refreshSession(jti), hashToken(token), 'EX', ttl);
  return token;
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  if (payload.typ !== 'access') {
    throw new Error('invalid_access_token_type');
  }
  return payload;
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  if (payload.typ !== 'refresh') {
    throw new Error('invalid_refresh_token_type');
  }
  const stored = await redis.get(REDIS_KEYS.refreshSession(payload.jti));
  if (!stored || stored !== hashToken(token)) {
    throw new Error('refresh_token_revoked');
  }
  return payload;
}

export async function rotateRefreshToken(
  oldToken: string,
): Promise<{ accessToken: string; refreshToken: string; payload: RefreshTokenPayload }> {
  const payload = await verifyRefreshToken(oldToken);
  await redis.del(REDIS_KEYS.refreshSession(payload.jti));
  const accessToken = signAccessToken(payload.sub, payload.login);
  const refreshToken = await issueRefreshToken(payload.sub, payload.login);
  return { accessToken, refreshToken, payload };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    await redis.del(REDIS_KEYS.refreshSession(payload.jti));
  } catch {
    // ignore invalid tokens on logout
  }
}

export function createOAuthState(): string {
  return randomBytes(24).toString('hex');
}
