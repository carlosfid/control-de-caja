import { CajaDatabase, database } from './db';
import { createAuditRepository } from './repositories/audit-repository';
import { createMovementRepository } from './repositories/movement-repository';
import { createRegisterRepository } from './repositories/register-repository';
import { createSessionRepository } from './repositories/session-repository';
import { createSettingsRepository } from './repositories/settings-repository';
import { createUserRepository } from './repositories/user-repository';
import { loadDemoData } from './seed';
import { createOutboxRepository } from '../sync/outbox-repository';
import { RealSyncEngine, type ApiClient } from '../sync/sync-engine';
import { NullSyncEngine, createSyncState, type SyncEngine } from '../sync/sync-state';

export interface Services {
  users: ReturnType<typeof createUserRepository>;
  settings: ReturnType<typeof createSettingsRepository>;
  audit: ReturnType<typeof createAuditRepository>;
  registers: ReturnType<typeof createRegisterRepository>;
  sessions: ReturnType<typeof createSessionRepository>;
  movements: ReturnType<typeof createMovementRepository>;
  outbox: ReturnType<typeof createOutboxRepository>;
  syncEngine: SyncEngine;
  syncState: ReturnType<typeof createSyncState>;
}

export async function createServices(db: CajaDatabase = database, apiClient?: ApiClient): Promise<Services> {
  await loadDemoData(db);
  if (!(await db.settings.get('deviceId'))) {
    await db.settings.put({ key: 'deviceId', value: crypto.randomUUID() });
  }
  const syncState = createSyncState();
  const syncEngine: SyncEngine = apiClient
    ? new RealSyncEngine(db, apiClient, (await db.settings.get('deviceId'))?.value ?? 'unknown-device')
    : new NullSyncEngine();

  return {
    users: createUserRepository(db),
    settings: createSettingsRepository(db),
    audit: createAuditRepository(db),
    registers: createRegisterRepository(db),
    sessions: createSessionRepository(db),
    movements: createMovementRepository(db),
    outbox: createOutboxRepository(db),
    syncEngine,
    syncState,
  };
}
