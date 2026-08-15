import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/error-handler.js';
import { UserModel } from '../models/user.model.js';
import {
  buildGitHubAuthorizeUrl,
  handleGitHubCallback,
  logout,
  refreshSession,
} from '../services/auth.service.js';

const isProd = env.NODE_ENV === 'production';

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  // Cross-origin web/API on Railway needs SameSite=None + Secure
  const sameSite = isProd ? 'none' : 'lax';
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    sameSite,
    secure: isProd,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    sameSite,
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

export async function githubStart(_req: Request, res: Response): Promise<void> {
  const { url } = await buildGitHubAuthorizeUrl();
  res.redirect(url);
}

export async function githubCallback(req: Request, res: Response): Promise<void> {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  if (!code || !state) {
    throw new HttpError(400, 'missing_oauth_params');
  }

  const result = await handleGitHubCallback(code, state);
  setAuthCookies(res, result.accessToken, result.refreshToken);

  const redirect = new URL('/auth/callback', env.CLIENT_ORIGIN);
  redirect.searchParams.set('ok', '1');
  res.redirect(redirect.toString());
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token =
    (req.cookies?.refresh_token as string | undefined) ||
    (typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined);
  if (!token) {
    throw new HttpError(401, 'refresh_token_required');
  }
  const tokens = await refreshSession(token);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.json({ accessToken: tokens.accessToken });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await UserModel.findById(req.user!.id).select('-accessToken -refreshTokenHash');
  if (!user) {
    throw new HttpError(404, 'user_not_found');
  }
  res.json({
    id: user._id.toString(),
    login: user.login,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  });
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refresh_token as string | undefined;
  await logout(token);
  res.clearCookie('access_token');
  res.clearCookie('refresh_token', { path: '/api/auth' });
  res.status(204).send();
}
