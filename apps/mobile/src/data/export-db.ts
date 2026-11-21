import type { CajaDatabase } from './db';

export async function exportDatabaseDump(db: CajaDatabase): Promise<string> {
  const [users, registers, sessions, movements, outbox, audit, settings] = await Promise.all([
    db.users.toArray(),
    db.registers.toArray(),
    db.sessions.toArray(),
    db.movements.toArray(),
    db.outbox.toArray(),
    db.audit.toArray(),
    db.settings.toArray(),
  ]);

  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    users: users.map(({ pinHash: _pinHash, pinSalt: _pinSalt, ...user }) => user),
    registers,
    sessions,
    movements,
    outbox,
    audit,
    settings: settings.filter((setting) => !setting.key.startsWith('pinLock:')),
  }, null, 2);
}
