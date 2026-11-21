import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createServices } from '../src/data/create-services';
import { CajaDatabase } from '../src/data/db';
import { loadDemoData } from '../src/data/demo-data';

const now = '2026-11-20T16:00:00Z';
const newDb = () => new CajaDatabase(`stage3-${crypto.randomUUID()}`);

describe('Stage 3 movements', () => {
  it('adds and lists a valid movement', async () => {
    const db = newDb();
    const services = await createServices(db);
    const user = (await services.users.getById('user-cashier-ana'))!;
    const opened = await services.sessions.openSession(user, 10000, '2026-11-20T12:00:00Z');
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;

    const result = await services.movements.add(user, opened.value, {
      type: 'sale', amountMinor: 2500, currency: 'CUP', description: 'Venta de prueba', occurredAt: '2026-11-20T13:00:00Z',
    }, now);
    expect(result).toMatchObject({ ok: true, value: { direction: 'in', amountMinor: 2500, syncStatus: 'local' } });
    expect(await services.movements.listBySession(opened.value.id)).toHaveLength(1);
    expect(await db.audit.where('action').equals('movement_created').count()).toBe(1);
    await db.delete();
  });

  it('rejects an invalid movement without writing it', async () => {
    const db = newDb();
    const services = await createServices(db);
    const user = (await services.users.getById('user-cashier-ana'))!;
    const opened = await services.sessions.openSession(user, 0, '2026-11-20T12:00:00Z');
    if (!opened.ok) return;

    const result = await services.movements.add(user, opened.value, {
      type: 'other_expense', amountMinor: 0, currency: 'USD', description: 'x', occurredAt: '2026-11-21T16:00:01Z',
    }, now);
    expect(result.ok).toBe(false);
    expect(await db.movements.count()).toBe(0);
    await db.delete();
  });

  it('loads demo movements only once', async () => {
    const db = newDb();
    await createServices(db);
    await loadDemoData(db);
    await loadDemoData(db);
    expect(await db.movements.count()).toBe(3);
    await db.delete();
  });

  it('watchBySession reports each new movement', async () => {
    const db = newDb();
    const services = await createServices(db);
    const user = (await services.users.getById('user-cashier-ana'))!;
    const opened = await services.sessions.openSession(user, 0, '2026-11-20T12:00:00Z');
    if (!opened.ok) return;

    const seen: number[] = [];
    const unsubscribe = services.movements.watchBySession(opened.value.id, (movements) => seen.push(movements.length));
    await services.movements.add(user, opened.value, {
      type: 'collection', amountMinor: 100, currency: 'CUP', description: 'Cobro', occurredAt: '2026-11-20T13:00:00Z',
    }, now);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(seen).toContain(1);
    unsubscribe();
    await db.delete();
  });
});
