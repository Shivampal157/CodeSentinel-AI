import { Router } from 'express';
import {
  githubCallback,
  githubStart,
  logoutHandler,
  me,
  refresh,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.get('/github', (req, res, next) => {
  void githubStart(req, res).catch(next);
});

authRouter.get('/github/callback', (req, res, next) => {
  void githubCallback(req, res).catch(next);
});

authRouter.post('/refresh', (req, res, next) => {
  void refresh(req, res).catch(next);
});

authRouter.post('/logout', (req, res, next) => {
  void logoutHandler(req, res).catch(next);
});

authRouter.get('/me', (req, res, next) => {
  void requireAuth(req, res, (err) => {
    if (err) {
      next(err);
      return;
    }
    void me(req, res).catch(next);
  });
});
