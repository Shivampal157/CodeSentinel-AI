import type { Request, Response } from 'express';
import { createComment, listComments, resolveComment } from '../services/comment.service.js';

export async function postComment(req: Request, res: Response): Promise<void> {
  const comment = await createComment(req.user!.id, {
    pullRequestId: req.params.id!,
    filePath: String(req.body.filePath),
    line: Number(req.body.line),
    body: String(req.body.body),
    parentId: req.body.parentId ? String(req.body.parentId) : undefined,
    side: req.body.side === 'LEFT' ? 'LEFT' : 'RIGHT',
  });
  res.status(201).json({
    id: comment._id.toString(),
    filePath: comment.filePath,
    line: comment.line,
    body: comment.body,
    parentId: comment.parentId?.toString() ?? null,
    resolved: comment.resolved,
  });
}

export async function getComments(req: Request, res: Response): Promise<void> {
  const comments = await listComments(req.user!.id, req.params.id!);
  res.json({
    comments: comments.map((c) => ({
      id: c._id.toString(),
      authorId: c.authorId.toString(),
      parentId: c.parentId?.toString() ?? null,
      filePath: c.filePath,
      line: c.line,
      side: c.side,
      body: c.body,
      resolved: c.resolved,
      source: c.source,
      createdAt: c.createdAt,
    })),
  });
}

export async function patchComment(req: Request, res: Response): Promise<void> {
  const resolved = Boolean(req.body.resolved);
  const comment = await resolveComment(req.user!.id, req.params.id!, resolved);
  res.json({
    id: comment._id.toString(),
    resolved: comment.resolved,
    resolvedAt: comment.resolvedAt,
  });
}
