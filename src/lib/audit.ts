import { db } from './db';

interface AuditEntry {
  orgId: string;
  userId: string;
  action: string;
  resourceId?: string;
  meta?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditEntry) {
  try {
    await db.auditLog.create({
      data: {
        orgId: entry.orgId,
        userId: entry.userId,
        action: entry.action,
        resourceId: entry.resourceId ?? null,
        meta: entry.meta ? (entry.meta as never) : undefined,
      },
    });
  } catch {
    // Audit failures must never break the main request
  }
}
