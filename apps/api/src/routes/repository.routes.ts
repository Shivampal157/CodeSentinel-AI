import { Router } from 'express';
import {
  getRepo,
  importRepo,
  listGithubRepos,
  listRepos,
  reindexRepo,
  semanticSearch,
} from '../controllers/repository.controller.js';
import {
  debtTrend,
  importPr,
  listPrs,
} from '../controllers/pull-request.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import {
  idParamSchema,
  importPrSchema,
  importRepoSchema,
  semanticSearchSchema,
} from '../validators/schemas.js';

export const repoRouter = Router();

repoRouter.use((req, res, next) => {
  void requireAuth(req, res, next);
});

repoRouter.get('/github', (req, res, next) => {
  void listGithubRepos(req, res).catch(next);
});

repoRouter.get('/', (req, res, next) => {
  void listRepos(req, res).catch(next);
});

repoRouter.post('/', validateBody(importRepoSchema), (req, res, next) => {
  void importRepo(req, res).catch(next);
});

repoRouter.get('/:id', validateParams(idParamSchema), (req, res, next) => {
  void getRepo(req, res).catch(next);
});

repoRouter.post('/:id/reindex', validateParams(idParamSchema), (req, res, next) => {
  void reindexRepo(req, res).catch(next);
});

repoRouter.post(
  '/:id/search',
  validateParams(idParamSchema),
  validateBody(semanticSearchSchema),
  (req, res, next) => {
    void semanticSearch(req, res).catch(next);
  },
);

repoRouter.get('/:id/pull-requests', validateParams(idParamSchema), (req, res, next) => {
  void listPrs(req, res).catch(next);
});

repoRouter.post(
  '/:id/pull-requests',
  validateParams(idParamSchema),
  validateBody(importPrSchema),
  (req, res, next) => {
    void importPr(req, res).catch(next);
  },
);

repoRouter.get('/:id/debt-trend', validateParams(idParamSchema), (req, res, next) => {
  void debtTrend(req, res).catch(next);
});
