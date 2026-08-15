import type { Request } from 'express';
import { AuditLogModel } from '../models/audit-log.model.js';

export type AuditAction =
  | 'repo.import'
  | 'repo.reindex'
  | 'pr.import'
  | 'review.start'
  | 'search.semantic';

export async function writeAuditLog(params: {
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}): Promise<void> {
  await AuditLogModel.create({
    userId: params.userId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    metadata: params.metadata ?? {},
    ip: params.req?.ip,
    requestId: params.req?.requestId,
  });
}
