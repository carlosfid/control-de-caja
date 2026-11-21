import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createServices } from '../src/data/create-services';
import { CajaDatabase } from '../src/data/db';

const now = '2026-11-21T16:00:00Z';
const newDb = () => new CajaDatabase(`stage4-${crypto.randomUUID()}`);

describe('Stage 4 counting and closing', () => {
  it('closes balanced, recalculates expected and blocks further movement', async () => {
    const db = newDb();
    const services = await createServices(db);
    const user = (await services.users.getById('user-cashier-ana'))!;
    const opened = await services.sessions.openSession(user, 10000, '2026-11-21T12:00:00Z');
    if (!opened.ok) throw new Error('session not opened');

    await services.movements.add(user, opened.value, {
      type: 'sale', amountMinor: 5000, currency: 'CUP', description: 'Venta', occurredAt: '2026-11-21T13:00:00Z',
    }, now);

    const closed = await services.sessions.closeSession(user, opened.value.id, 15000, null, null, now);
    expect(closed).toMatchObject({ ok: true, value: { status: 'closed', expectedBalanceMinor: 15000, varianceMinor: 0 } });

    const afterClose = await services.movements.add(user, opened.value, {
      type: 'sale', amountMinor: 100, currency: 'CUP', description: 'No debe guardar', occurredAt: '2026-11-21T14:00:00Z',
    }, now);
    expect(afterClose).toMatchObject({ ok: false, errors: [{ code: 'SESSION_NOT_OPEN' }] });
    await db.delete();
  });

  it('requires a note for shortage and surplus', async () => {
    const db = newDb();
    const services = await createServices(db);
    const user = (await services.users.getById('user-cashier-ana'))!;
    const opened = await services.sessions.openSession(user, 10000, '2026-11-21T12:00:00Z');
    if (!opened.ok) throw new Error('session not opened');

    expect(await services.sessions.closeSession(user, opened.value.id, 9000, null, null, now)).toMatchObject({
      ok: false,
      errors: [{ code: 'VARIANCE_NOTE_REQUIRED' }],
    });

    expect(await services.sessions.closeSession(user, opened.value.id, 11000, 'x', null, now)).toMatchObject({
      ok: false,
      errors: [{ code: 'VARIANCE_NOTE_REQUIRED' }],
    });
    await db.delete();
  });

  it('rejects a second close and filters history', async () => {
    const db = newDb();
    const services = await createServices(db);
    const user = (await services.users.getById('user-cashier-ana'))!;
    const opened = await services.sessions.openSession(user, 0, '2026-11-21T12:00:00Z');
    if (!opened.ok) throw new Error('session not opened');

    expect((await services.sessions.closeSession(user, opened.value.id, 0, null, null, now)).ok).toBe(true);
    expect(await services.sessions.closeSession(user, opened.value.id, 0, null, null, now)).toMatchObject({
      ok: false,
      errors: [{ code: 'SESSION_ALREADY_CLOSED' }],
    });

    expect(await services.sessions.listByUser(user.id, 'closed')).toHaveLength(1);
    expect(await services.sessions.listAll('open')).toHaveLength(0);
    await db.delete();
  });

  it('ignores a manipulated expected value and recalculates from movements', async () => {
    const db = newDb();
    const services = await createServices(db);
    const user = (await services.users.getById('user-cashier-ana'))!;
    const opened = await services.sessions.openSession(user, 10000, '2026-11-21T12:00:00Z');
    if (!opened.ok) throw new Error('session not opened');

    await db.sessions.update(opened.value.id, { expectedBalanceMinor: 999999 });
    await services.movements.add(user, opened.value, {
      type: 'refund', amountMinor: 2000, currency: 'CUP', description: 'Reembolso', occurredAt: '2026-11-21T13:00:00Z',
    }, now);

    const closed = await services.sessions.closeSession(user, opened.value.id, 8000, null, null, now);
    expect(closed).toMatchObject({ ok: true, value: { expectedBalanceMinor: 8000, varianceMinor: 0 } });
    await db.delete();
  });
});
