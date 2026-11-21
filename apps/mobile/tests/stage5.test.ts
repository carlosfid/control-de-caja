import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createServices } from '../src/data/create-services';
import { CajaDatabase } from '../src/data/db';
import { createSyncState, NullSyncEngine } from '../src/sync/sync-state';

const now = '2026-11-21T16:00:00Z';
const newDb = () => new CajaDatabase(`stage5-${crypto.randomUUID()}`);

describe('Stage 5 offline outbox', () => {
  it('keeps five offline movements local and retro-enqueues them once', async () => {
    const db = newDb();
    const services = await createServices(db);
    const user = (await services.users.getById('user-cashier-ana'))!;
    const opened = await services.sessions.openSession(user, 10000, '2026-11-21T12:00:00Z');
    if (!opened.ok) throw new Error('session not opened');

    for (let index = 0; index < 5; index += 1) {
      const movement = await services.movements.add(user, opened.value, {
        type: 'sale', amountMinor: 100, currency: 'CUP', description: `Venta ${index + 1}`, occurredAt: '2026-11-21T13:00:00Z',
      }, now);
      expect(movement).toMatchObject({ ok: true, value: { syncStatus: 'local' } });
    }

    expect(await db.outbox.count()).toBe(0);
    await services.settings.set('serverUrl', 'http://localhost:3000');

    const entries = await services.outbox.listEntries();
    expect(entries).toHaveLength(6);
    expect(entries.map((entry) => entry.sequence)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(await db.movements.where('syncStatus').equals('pending').count()).toBe(5);
    await db.delete();
  });

  it('creates pending records atomically when a server URL exists', async () => {
    const db = newDb();
    const services = await createServices(db);
    await services.settings.set('serverUrl', 'http://localhost:3000');
    const user = (await services.users.getById('user-cashier-ana'))!;
    const opened = await services.sessions.openSession(user, 0, '2026-11-21T12:00:00Z', );
    expect(opened).toMatchObject({ ok: true, value: { syncStatus: 'pending' } });
    if (!opened.ok) return;

    const movement = await services.movements.add(user, opened.value, {
      type: 'sale', amountMinor: 100, currency: 'CUP', description: 'Venta pendiente', occurredAt: '2026-11-21T13:00:00Z',
    }, now);
    expect(movement).toMatchObject({ ok: true, value: { syncStatus: 'pending' } });
    expect(await db.outbox.count()).toBe(2);
    await db.delete();
  });

  it('allows retryEntry only for error entries', async () => {
    const db = newDb();
    const services = await createServices(db);
    await services.settings.set('serverUrl', 'http://localhost:3000');
    const user = (await services.users.getById('user-cashier-ana'))!;
    const opened = await services.sessions.openSession(user, 0, '2026-11-21T12:00:00Z');
    if (!opened.ok) return;

    const entries = await services.outbox.listEntries();
    const entry = entries[0];
    expect(await services.outbox.retryEntry(entry.id)).toMatchObject({ ok: false, errors: [{ code: 'SYNC_ENTRY_NOT_RETRYABLE' }] });

    await db.outbox.update(entry.id, { status: 'error' });
    expect(await services.outbox.retryEntry(entry.id)).toMatchObject({ ok: true, value: { status: 'pending' } });
    await db.delete();
  });

  it('exposes sync state and a null engine until E6', async () => {
    const state = createSyncState();
    const seen: string[] = [];
    const unsubscribe = state.watch((value) => seen.push(value.phase));
    expect(seen).toEqual(['idle']);

    state.set({ phase: 'offline', lastSyncAt: null, pendingCount: 5, lastError: null });
    expect(state.get()).toMatchObject({ phase: 'offline', pendingCount: 5 });
    unsubscribe();

    const engine = new NullSyncEngine();
    await expect(engine.sync()).resolves.toBeUndefined();
  });

  it('creates close outbox entry after closing', async () => {
    const db = newDb();
    const services = await createServices(db);
    await services.settings.set('serverUrl', 'http://localhost:3000');
    const user = (await services.users.getById('user-cashier-ana'))!;
    const opened = await services.sessions.openSession(user, 0, '2026-11-21T12:00:00Z');
    if (!opened.ok) return;

    const closed = await services.sessions.closeSession(user, opened.value.id, 0, null, null, now);
    expect(closed).toMatchObject({ ok: true, value: { syncStatus: 'pending' } });
    expect(await db.outbox.where('operation').equals('close').count()).toBe(1);
    await db.delete();
  });
});
