import { Router } from 'express';
import {
  getPr,
  getPrDiff,
  getReviewById,
  triggerReview,
} from '../controllers/pull-request.controller.js';
import { getComments, patchComment, postComment } from '../controllers/comment.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import {
  createCommentSchema,
  idParamSchema,
  resolveCommentSchema,
} from '../validators/schemas.js';

export const prRouter = Router();

prRouter.use((req, res, next) => {
  void requireAuth(req, res, next);
});

prRouter.get('/:id', validateParams(idParamSchema), (req, res, next) => {
  void getPr(req, res).catch(next);
});

prRouter.get('/:id/diff', validateParams(idParamSchema), (req, res, next) => {
  void getPrDiff(req, res).catch(next);
});

prRouter.post('/:id/review', validateParams(idParamSchema), (req, res, next) => {
  void triggerReview(req, res).catch(next);
});

prRouter.get('/:id/comments', validateParams(idParamSchema), (req, res, next) => {
  void getComments(req, res).catch(next);
});

prRouter.post(
  '/:id/comments',
  validateParams(idParamSchema),
  validateBody(createCommentSchema),
  (req, res, next) => {
    void postComment(req, res).catch(next);
  },
);

export const reviewRouter = Router();
reviewRouter.use((req, res, next) => {
  void requireAuth(req, res, next);
});
reviewRouter.get('/:id', validateParams(idParamSchema), (req, res, next) => {
  void getReviewById(req, res).catch(next);
});

export const commentRouter = Router();
commentRouter.use((req, res, next) => {
  void requireAuth(req, res, next);
});
commentRouter.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(resolveCommentSchema),
  (req, res, next) => {
    void patchComment(req, res).catch(next);
  },
);
