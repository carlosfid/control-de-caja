import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { summarizeSession } from '@caja/domain';
import { createServices } from '../src/data/create-services';
import { CajaDatabase } from '../src/data/db';

const now = '2026-11-21T16:00:00Z';
const newDb = () => new CajaDatabase(`stage7-${crypto.randomUUID()}`);

describe('Stage 7 reversals', () => {
  it('reverses an income and restores the prior balance', async () => {
    const db = newDb();
    const services = await createServices(db);
    const user = (await services.users.getById('user-cashier-ana'))!;
    const opened = await services.sessions.openSession(user, 10000, '2026-11-21T12:00:00Z');
    if (!opened.ok) throw new Error('session not opened');

    const original = await services.movements.add(user, opened.value, {
      type: 'sale', amountMinor: 5000, currency: 'CUP', description: 'Venta original', occurredAt: '2026-11-21T13:00:00Z',
    }, now);
    if (!original.ok) throw new Error('movement not added');

    const before = summarizeSession(opened.value, await services.movements.listBySession(opened.value.id));
    const reversal = await services.movements.reverse(user, opened.value, original.value.id, 'Error de registro', now);
    expect(reversal.ok).toBe(true);

    const movements = await services.movements.listBySession(opened.value.id);
    const after = summarizeSession(opened.value, movements);
    expect(after.expectedBalanceMinor).toBe(before.expectedBalanceMinor - 5000);

    const storedOriginal = await services.movements.getById(original.value.id);
    expect(storedOriginal?.reversedBy).toBe(reversal.ok ? reversal.value.id : null);
    await db.delete();
  });

  it('rejects short reasons, second reversal and reversal of reversal', async () => {
    const db = newDb();
    const services = await createServices(db);
    const user = (await services.users.getById('user-cashier-ana'))!;
    const opened = await services.sessions.openSession(user, 0, '2026-11-21T12:00:00Z');
    if (!opened.ok) throw new Error('session not opened');

    const original = await services.movements.add(user, opened.value, {
      type: 'sale', amountMinor: 100, currency: 'CUP', description: 'Venta', occurredAt: '2026-11-21T13:00:00Z',
    }, now);
    if (!original.ok) throw new Error('movement not added');

    expect(await services.movements.reverse(user, opened.value, original.value.id, 'x', now)).toMatchObject({
      ok: false,
      errors: [{ code: 'REVERSAL_REASON_REQUIRED' }],
    });

    const first = await services.movements.reverse(user, opened.value, original.value.id, 'Error válido', now);
    expect(first.ok).toBe(true);
    expect(await services.movements.reverse(user, opened.value, original.value.id, 'Segundo intento', now)).toMatchObject({
      ok: false,
      errors: [{ code: 'REVERSAL_ALREADY_DONE' }],
    });

    if (first.ok) {
      expect(await services.movements.reverse(user, opened.value, first.value.id, 'Anular la anulación', now)).toMatchObject({
        ok: false,
        errors: [{ code: 'REVERSAL_OF_REVERSAL' }],
      });
    }
    await db.delete();
  });

  it('rejects reversal after closing', async () => {
    const db = newDb();
    const services = await createServices(db);
    const user = (await services.users.getById('user-cashier-ana'))!;
    const opened = await services.sessions.openSession(user, 0, '2026-11-21T12:00:00Z');
    if (!opened.ok) throw new Error('session not opened');

    const original = await services.movements.add(user, opened.value, {
      type: 'sale', amountMinor: 100, currency: 'CUP', description: 'Venta', occurredAt: '2026-11-21T13:00:00Z',
    }, now);
    await services.sessions.closeSession(user, opened.value.id, 100, null, null, now);
    if (!original.ok) throw new Error('movement not added');

    expect(await services.movements.reverse(user, opened.value, original.value.id, 'Error válido', now)).toMatchObject({
      ok: false,
      errors: [{ code: 'SESSION_NOT_OPEN' }],
    });
    await db.delete();
  });
});
