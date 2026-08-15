import { CommentModel } from '../models/comment.model.js';
import { HttpError } from '../middleware/error-handler.js';
import { getPullRequest } from './pull-request.service.js';
import { getIo } from '../sockets/io.js';
import { SOCKET_EVENTS } from '@codesentinel/shared';

export async function createComment(
  userId: string,
  input: {
    pullRequestId: string;
    filePath: string;
    line: number;
    body: string;
    parentId?: string;
    side?: 'LEFT' | 'RIGHT';
  },
) {
  await getPullRequest(userId, input.pullRequestId);
  if (input.parentId) {
    const parent = await CommentModel.findById(input.parentId);
    if (!parent || parent.pullRequestId.toString() !== input.pullRequestId) {
      throw new HttpError(400, 'invalid_parent_comment');
    }
  }

  const comment = await CommentModel.create({
    pullRequestId: input.pullRequestId,
    authorId: userId,
    parentId: input.parentId ?? null,
    filePath: input.filePath,
    line: input.line,
    side: input.side ?? 'RIGHT',
    body: input.body,
    source: 'human',
  });

  getIo()?.to(`pr:${input.pullRequestId}`).emit(SOCKET_EVENTS.commentCreated, {
    comment: serializeComment(comment),
  });

  return comment;
}

export async function listComments(userId: string, pullRequestId: string) {
  await getPullRequest(userId, pullRequestId);
  return CommentModel.find({ pullRequestId }).sort({ createdAt: 1 });
}

export async function resolveComment(userId: string, commentId: string, resolved: boolean) {
  const comment = await CommentModel.findById(commentId);
  if (!comment) throw new HttpError(404, 'comment_not_found');
  await getPullRequest(userId, comment.pullRequestId.toString());

  comment.resolved = resolved;
  comment.resolvedBy = resolved ? (userId as unknown as typeof comment.resolvedBy) : undefined;
  comment.resolvedAt = resolved ? new Date() : undefined;
  await comment.save();

  getIo()?.to(`pr:${comment.pullRequestId.toString()}`).emit(SOCKET_EVENTS.commentUpdated, {
    comment: serializeComment(comment),
  });

  return comment;
}

function serializeComment(comment: InstanceType<typeof CommentModel>) {
  return {
    id: comment._id.toString(),
    pullRequestId: comment.pullRequestId.toString(),
    authorId: comment.authorId.toString(),
    parentId: comment.parentId ? comment.parentId.toString() : null,
    filePath: comment.filePath,
    line: comment.line,
    side: comment.side,
    body: comment.body,
    resolved: comment.resolved,
    source: comment.source,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}
