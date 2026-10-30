import type { AuditEntry } from '@caja/domain';
import type { CajaDatabase } from '../db';

export interface AuditRepository {
  list(): Promise<AuditEntry[]>;
  listByEntity(entityType: string, entityId: string): Promise<AuditEntry[]>;
}

export function createAuditRepository(db: CajaDatabase): AuditRepository {
  return {
    async list() { return db.audit.orderBy('at').reverse().toArray(); },
    async listByEntity(entityType, entityId) { return db.audit.where('[entityType+entityId]').equals([entityType, entityId]).toArray(); },
  };
}
