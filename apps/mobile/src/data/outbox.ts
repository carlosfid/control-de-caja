import { canTransition, type OutboxEntry, type SyncStatus } from '@caja/domain';
import type { CajaDatabase } from './db';
import { createUuid } from './id';

export async function hasServerUrl(db: CajaDatabase): Promise<boolean> {
  const setting = await db.settings.get('serverUrl');
  return Boolean(setting?.value.trim());
}

export async function enqueueOutbox(
  db: CajaDatabase,
  entityType: 'session' | 'movement',
  entityId: string,
  operation: 'create' | 'close',
  now: string,
): Promise<OutboxEntry> {
  const last = await db.outbox.orderBy('sequence').last();
  const entry: OutboxEntry = {
    id: createUuid(),
    sequence: (last?.sequence ?? 0) + 1,
    entityType,
    entityId,
    operation,
    status: 'pending',
    attempts: 0,
    lastAttemptAt: null,
    nextAttemptAt: null,
    lastError: null,
    serverResult: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.outbox.add(entry);
  return entry;
}

export async function setOutboxStatus(
  db: CajaDatabase,
  entryId: string,
  status: SyncStatus,
  now: string,
): Promise<OutboxEntry | null> {
  const entry = await db.outbox.get(entryId);
  if (!entry || !canTransition(entry.status, status)) return null;
  const updated = { ...entry, status, updatedAt: now };
  await db.outbox.put(updated);
  return updated;
}

export async function enqueueLocalRecords(db: CajaDatabase, now: string): Promise<number> {
  const sessions = await db.sessions.where('syncStatus').equals('local').toArray();
  const movements = await db.movements.where('syncStatus').equals('local').toArray();
  let count = 0;

  for (const session of sessions) {
    await enqueueOutbox(db, 'session', session.id, session.status === 'closed' ? 'close' : 'create', now);
    await db.sessions.put({ ...session, syncStatus: 'pending' });
    count += 1;
  }
  for (const movement of movements) {
    await enqueueOutbox(db, 'movement', movement.id, 'create', now);
    await db.movements.put({ ...movement, syncStatus: 'pending' });
    count += 1;
  }
  return count;
}
