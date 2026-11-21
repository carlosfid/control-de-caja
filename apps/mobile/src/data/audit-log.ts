import type { AuditEntry } from '@caja/domain';
import type { CajaDatabase } from './db';

export async function writeAudit(db: CajaDatabase, entry: Omit<AuditEntry, 'id' | 'at'> & { id?: string; at?: string }): Promise<void> {
  await db.audit.add({
    id: entry.id ?? crypto.randomUUID(),
    at: entry.at ?? new Date().toISOString(),
    userId: entry.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    details: entry.details,
  });
}
