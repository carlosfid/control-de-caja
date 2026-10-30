import { CajaDatabase, database } from './db';
import { createAuditRepository } from './repositories/audit-repository';
import { createSettingsRepository } from './repositories/settings-repository';
import { createUserRepository } from './repositories/user-repository';
import { loadDemoData } from './seed';

export interface Services {
  users: ReturnType<typeof createUserRepository>;
  settings: ReturnType<typeof createSettingsRepository>;
  audit: ReturnType<typeof createAuditRepository>;
}

export async function createServices(db: CajaDatabase = database): Promise<Services> {
  await loadDemoData(db);
  if (!(await db.settings.get('deviceId'))) {
    await db.settings.put({ key: 'deviceId', value: crypto.randomUUID() });
  }
  return {
    users: createUserRepository(db),
    settings: createSettingsRepository(db),
    audit: createAuditRepository(db),
  };
}
