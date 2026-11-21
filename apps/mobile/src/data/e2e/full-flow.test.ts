import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createServices } from '../create-services';
import { CajaDatabase } from '../db';
import { RealSyncEngine, type ApiClient } from '../../sync/sync-engine';

const now = '2026-11-21T16:00:00Z';
const newDb = () => new CajaDatabase(`e2e-${crypto.randomUUID()}`);

describe('E8 full offline-to-sync flow', () => {
  it('opens, moves, closes, reconnects and syncs', async () => {
    const db = newDb();
    const services = await createServices(db);
    const user = (await services.users.getById('user-cashier-ana'))!;

    const opened = await services.sessions.openSession(user, 10000, '2026-11-21T12:00:00Z');
    if (!opened.ok) throw new Error('open failed');

    await services.movements.add(user, opened.value, {
      type: 'sale', amountMinor: 5000, currency: 'CUP', description: 'Venta offline', occurredAt: '2026-11-21T13:00:00Z',
    }, now);

    expect(await db.outbox.count()).toBe(0);

    const closed = await services.sessions.closeSession(user, opened.value.id, 14000, 'Sobrante menor', null, now);
    expect(closed).toMatchObject({ ok: true, value: { status: 'closed', expectedBalanceMinor: 15000, varianceMinor: -1000 } });

    await services.settings.set('serverUrl', 'http://localhost:3000');
    expect(await db.outbox.count()).toBeGreaterThanOrEqual(2);
    expect(await db.outbox.where('operation').equals('close').count()).toBe(1);

    const api: ApiClient = {
      async sendBatch(request) {
        return { ok: true, response: { results: request.records.map((record) => ({ recordId: record.recordId, status: 'accepted' as const })) } };
      },
    };

    await new RealSyncEngine(db, api, 'device-e2e').sync(now);
    expect(await db.outbox.where('status').equals('synced').count()).toBeGreaterThanOrEqual(2);

    await db.delete();
  });

  it('handles 1,000 offline movements without losing records', async () => {
    const db = newDb();
    const services = await createServices(db);
    const user = (await services.users.getById('user-cashier-ana'))!;
    const opened = await services.sessions.openSession(user, 0, '2026-11-21T12:00:00Z');
    if (!opened.ok) throw new Error('open failed');

    await db.transaction('rw', db.movements, db.sessions, db.outbox, db.settings, db.audit, async () => {
      for (let index = 0; index < 1000; index += 1) {
        await services.movements.add(user, opened.value, {
          type: 'sale', amountMinor: 100, currency: 'CUP', description: `Carga ${index}`, occurredAt: '2026-11-21T13:00:00Z',
        }, now);
      }
    });

    expect(await db.movements.count()).toBe(1000);
    await db.delete();
  });
});
