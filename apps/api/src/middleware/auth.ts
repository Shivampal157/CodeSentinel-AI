import type { NextFunction, Request, Response } from 'express';
import { HttpError } from './error-handler.js';
import { verifyAccessToken } from '../services/token.service.js';
import { UserModel } from '../models/user.model.js';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.header('authorization');
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const cookieToken = req.cookies?.access_token as string | undefined;
    const token = bearer || cookieToken;
    if (!token) {
      throw new HttpError(401, 'authentication_required');
    }

    const payload = verifyAccessToken(token);
    const user = await UserModel.findById(payload.sub);
    if (!user) {
      throw new HttpError(401, 'user_not_found');
    }

    req.user = {
      id: user._id.toString(),
      login: user.login,
      githubId: user.githubId,
    };
    next();
  } catch (err) {
    if (err instanceof HttpError) {
      next(err);
      return;
    }
    next(new HttpError(401, 'invalid_token'));
  }
}
