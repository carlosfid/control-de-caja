import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createServices } from '../src/data/create-services';
import { CajaDatabase } from '../src/data/db';
import { createSessionRepository } from '../src/data/repositories/session-repository';

const now = '2026-11-02T12:00:00.000Z';
const newDb = (name = `stage2-${crypto.randomUUID()}`) => new CajaDatabase(name);

describe('Stage 2 cash sessions', () => {
  it('opens one session and writes the opening audit entry', async () => {
    const db = newDb();
    const services = await createServices(db);
    const user = await services.users.getById('user-cashier-ana');
    expect(user).toBeDefined();
    const result = await services.sessions.openSession(user!, 12345, now);
    expect(result).toMatchObject({
      ok: true,
      value: {
        userId: 'user-cashier-ana',
        registerId: 'reg-01',
        currency: 'CUP',
        openingBalanceMinor: 12345,
        status: 'open',
        syncStatus: 'local',
      },
    });
    expect(await services.audit.list()).toMatchObject([
      { action: 'session_opened', details: { openingBalanceMinor: 12345 } },
    ]);
    await db.delete();
  });

  it('allows only one concurrent opening per user', async () => {
    const db = newDb();
    const services = await createServices(db);
    const user = await services.users.getById('user-cashier-ana');
    expect(user).toBeDefined();
    const results = await Promise.all([
      services.sessions.openSession(user!, 100, now),
      services.sessions.openSession(user!, 200, now),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);
    expect(await services.sessions.listByUser(user!.id)).toHaveLength(1);
    expect(await db.audit.where('action').equals('session_opened').count()).toBe(1);
    await db.delete();
  });

  it('rejects accountants, negative balances and non-numeric balances', async () => {
    const db = newDb();
    const services = await createServices(db);
    const accountant = await services.users.getById('user-accountant-marta');
    const cashier = await services.users.getById('user-cashier-ana');
    expect(accountant).toBeDefined();
    expect(cashier).toBeDefined();
    expect(await services.sessions.openSession(accountant!, 100, now))
      .toMatchObject({ ok: false, errors: [{ code: 'PERMISSION_DENIED' }] });
    expect(await services.sessions.openSession(cashier!, -1, now))
      .toMatchObject({ ok: false, errors: [{ code: 'OPENING_BALANCE_INVALID' }] });
    expect(await services.sessions.openSession(cashier!, Number.NaN, now))
      .toMatchObject({ ok: false, errors: [{ code: 'OPENING_BALANCE_INVALID' }] });
    expect(await services.sessions.listAll()).toHaveLength(0);
    await db.delete();
  });

  it('persists an opened session after closing and reopening the database', async () => {
    const name = `stage2-persist-${crypto.randomUUID()}`;
    const db = newDb(name);
    const services = await createServices(db);
    const user = await services.users.getById('user-cashier-ana');
    expect(user).toBeDefined();
    const opened = await services.sessions.openSession(user!, 54321, now);
    expect(opened.ok).toBe(true);
    const sessionId = opened.ok ? opened.value.id : '';
    db.close();

    const reopenedDb = new CajaDatabase(name);
    const reopenedServices = await createServices(reopenedDb);
    expect(await reopenedServices.sessions.getById(sessionId)).toMatchObject({
      id: sessionId,
      openingBalanceMinor: 54321,
      status: 'open',
    });
    await reopenedDb.delete();
  });

  it('lists seeded registers and resolves a register by id', async () => {
    const db = newDb();
    const services = await createServices(db);
    expect(await services.registers.list()).toHaveLength(2);
    expect(await services.registers.getById('reg-01')).toMatchObject({ id: 'reg-01' });
    expect(await services.registers.getById('missing')).toBeNull();
    await db.delete();
  });

  it('returns session not found when closing an unknown session in Stage 4', async () => {
    const db = newDb();
    const services = await createServices(db);
    const cashier = (await services.users.getById('user-cashier-ana'))!;
    const repository = createSessionRepository(db);
    expect(await repository.closeSession(cashier, 'missing-session', 0, null)).toMatchObject({
      ok: false,
      errors: [{ code: 'SESSION_NOT_FOUND' }],
    });
    await db.delete();
  });
});
