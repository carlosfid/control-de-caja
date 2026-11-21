import type { AuditEntry } from '@caja/domain';
import type { CajaDatabase } from '../db';

export interface AuditFilters {
  userId?: string;
  action?: string;
  fromAt?: string;
  toAt?: string;
  limit?: number;
  offset?: number;
}

export interface AuditRepository {
  list(filters?: AuditFilters): Promise<AuditEntry[]>;
  listByEntity(entityType: string, entityId: string): Promise<AuditEntry[]>;
}

export function createAuditRepository(db: CajaDatabase): AuditRepository {
  return {
    async list(filters = {}) {
      let entries = await db.audit.orderBy('at').reverse().toArray();
      if (filters.userId) entries = entries.filter((entry) => entry.userId === filters.userId);
      if (filters.action) entries = entries.filter((entry) => entry.action === filters.action);
      if (filters.fromAt) entries = entries.filter((entry) => entry.at >= filters.fromAt!);
      if (filters.toAt) entries = entries.filter((entry) => entry.at <= filters.toAt!);
      const offset = filters.offset ?? 0;
      const limit = filters.limit ?? 100;
      return entries.slice(offset, offset + limit);
    },
    async listByEntity(entityType, entityId) { return db.audit.where('[entityType+entityId]').equals([entityType, entityId]).toArray(); },
  };
}
