import { liveQuery } from 'dexie';
import { ERROR_CODES, failure, success, type OutboxEntry, type Result, type SyncStatus } from '@caja/domain';
import type { CajaDatabase } from '../data/db';
import { setOutboxStatus } from '../data/outbox';

export interface OutboxSummary {
  local: number;
  pending: number;
  syncing: number;
  synced: number;
  rejected: number;
  error: number;
}

export function createOutboxRepository(db: CajaDatabase) {
  const repository = {
    async getSummary(): Promise<OutboxSummary> {
      const entries = await db.outbox.toArray();
      const summary: OutboxSummary = { local: 0, pending: 0, syncing: 0, synced: 0, rejected: 0, error: 0 };
      for (const entry of entries) summary[entry.status] += 1;
      return summary;
    },

    async listEntries(status?: SyncStatus): Promise<OutboxEntry[]> {
      const entries = status
        ? await db.outbox.where('status').equals(status).toArray()
        : await db.outbox.toArray();
      return entries.sort((left, right) => left.sequence - right.sequence);
    },

    watchSummary(callback: (summary: OutboxSummary) => void): () => void {
      const subscription = liveQuery(() => repository.getSummary()).subscribe({
        next: callback,
        error: (error: unknown) => console.error('Error observando el resumen de sincronización', error),
      });
      return () => subscription.unsubscribe();
    },

    watchEntries(status: SyncStatus | undefined, callback: (entries: OutboxEntry[]) => void): () => void {
      const subscription = liveQuery(() => repository.listEntries(status)).subscribe({
        next: callback,
        error: (error: unknown) => console.error('Error observando la cola', error),
      });
      return () => subscription.unsubscribe();
    },

    async retryEntry(id: string, now = new Date().toISOString()): Promise<Result<OutboxEntry>> {
      const entry = await db.outbox.get(id);
      if (!entry) return failure({ code: ERROR_CODES.SYNC_ENTRY_NOT_FOUND });
      if (entry.status !== 'error') return failure({ code: ERROR_CODES.SYNC_ENTRY_NOT_RETRYABLE });
      const updated = await setOutboxStatus(db, id, 'pending', now);
      if (!updated) return failure({ code: ERROR_CODES.SYNC_ENTRY_NOT_RETRYABLE });
      return success(updated);
    },
  };
  return repository;
}
