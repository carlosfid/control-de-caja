import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createServices } from '../src/data/create-services';
import { CajaDatabase } from '../src/data/db';
import { resetLocalData } from '../src/data/reset';
import { exportDatabaseDump } from '../src/data/export-db';
import { loadDemoScenario } from '../src/data/demo-data';

const newDb = () => new CajaDatabase(`stage8-${crypto.randomUUID()}`);

describe('Stage 8 support and demo', () => {
  it('resets and re-seeds the local database', async () => {
    const db = newDb();
    await createServices(db);
    await db.sessions.add({
      id: 'test-session', userId: 'user-cashier-ana', registerId: 'reg-01', currency: 'CUP', openedAt: '2026-11-21T12:00:00Z', openingBalanceMinor: 0,
      status: 'open', closedAt: null, countedBalanceMinor: null, expectedBalanceMinor: null, varianceMinor: null, varianceNote: null,
      closedByUserId: null, denominationBreakdown: null, syncStatus: 'local',
    });

    await resetLocalData(db);
    expect(await db.sessions.get('test-session')).toBeUndefined();
    expect(await db.users.count()).toBe(3);
    await db.delete();
  });

  it('exports a support dump without PIN hashes, PIN salts or PIN locks', async () => {
    const db = newDb();
    await createServices(db);
    await db.settings.put({ key: 'pinLock:user-cashier-ana', value: '{"failures":5}' });

    const dump = JSON.parse(await exportDatabaseDump(db));
    expect(dump.users[0]).not.toHaveProperty('pinHash');
    expect(dump.users[0]).not.toHaveProperty('pinSalt');
    expect(dump.settings.some((setting: { key: string }) => setting.key.startsWith('pinLock:'))).toBe(false);
    await db.delete();
  });

  it('loads a demo scenario with a deliberately oversized movement', async () => {
    const db = newDb();
    await createServices(db);
    await loadDemoScenario(db);

    const oversized = (await db.movements.toArray()).find((movement) => movement.amountMinor === 20_000_000);
    expect(oversized).toMatchObject({ description: 'Venta de demostración sobre el límite' });
    await db.delete();
  });
});
