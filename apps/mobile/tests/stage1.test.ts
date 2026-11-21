import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { CajaDatabase } from '../src/data/db';
import { createServices } from '../src/data/create-services';
import { resetLocalData } from '../src/data/seed';

function newDb() { return new CajaDatabase(`test-${crypto.randomUUID()}`); }

describe('Stage 1 local access', () => {
  it('seeds demo users idempotently', async () => {
    const db = newDb();
    const services = await createServices(db);
    await createServices(db);
    expect(await services.users.listDemoUsers()).toHaveLength(3);
    expect(await db.users.count()).toBe(3);
    await db.delete();
  });

  it('does not expose PIN hashes and validates a correct PIN', async () => {
    const db = newDb();
    const services = await createServices(db);
    const result = await services.users.verifyPin('user-cashier-ana', '1234', '2026-01-01T00:00:00Z');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).not.toHaveProperty('pinHash');
    expect(await db.users.get('user-cashier-ana')).toHaveProperty('pinHash');
    await db.delete();
  });

  it('rejects wrong PINs and records failed login audit', async () => {
    const db = newDb();
    const services = await createServices(db);
    const result = await services.users.verifyPin('user-cashier-ana', '9999', '2026-01-01T00:00:00Z');
    expect(result).toMatchObject({ ok: false, errors: [{ code: 'PIN_WRONG' }] });
    expect(await db.audit.where('action').equals('login_failed').count()).toBe(1);
    await db.delete();
  });

  it('records successful login audit', async () => {
    const db = newDb();
    const services = await createServices(db);
    await services.users.verifyPin('user-supervisor-luis', '2345');
    expect(await db.audit.where('action').equals('login_success').count()).toBe(1);
    await db.delete();
  });

  it('locks after five failures with remaining seconds', async () => {
    const db = newDb();
    const services = await createServices(db);
    let result: Awaited<ReturnType<typeof services.users.verifyPin>> | undefined;
    for (let i = 0; i < 5; i += 1) result = await services.users.verifyPin('user-cashier-ana', '9999', '2026-01-01T00:00:00Z');
    expect(result).toMatchObject({ ok: false, errors: [{ code: 'PIN_LOCKED', params: { remainingSeconds: 60 } }] });
    await db.delete();
  });
});
