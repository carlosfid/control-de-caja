import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createServices } from '../src/data/create-services';
import { CajaDatabase } from '../src/data/db';
import { backoffSeconds, nextAttemptAt } from '../src/sync/backoff';
import { RealSyncEngine, type ApiClient } from '../src/sync/sync-engine';

const now = '2026-11-21T16:00:00Z';
const newDb = () => new CajaDatabase(`stage6-${crypto.randomUUID()}`);

describe('Stage 6 sync engine', () => {
  it('applies accepted and rejected results in one cycle', async () => {
    const db = newDb();
    const services = await createServices(db);
    await services.settings.set('serverUrl', 'http://localhost:3000');
    const user = (await services.users.getById('user-cashier-ana'))!;
    const opened = await services.sessions.openSession(
      user,
      10000,
      '2026-11-21T12:00:00Z',
    );
    if (!opened.ok) throw new Error('session not opened');

    await services.movements.add(
      user,
      opened.value,
      {
        type: 'sale',
        amountMinor: 100,
        currency: 'CUP',
        description: 'Aceptada',
        occurredAt: '2026-11-21T13:00:00Z',
      },
      now,
    );
    await services.movements.add(
      user,
      opened.value,
      {
        type: 'sale',
        amountMinor: 200,
        currency: 'CUP',
        description: 'Rechazada',
        occurredAt: '2026-11-21T13:01:00Z',
      },
      now,
    );

    const api: ApiClient = {
      async sendBatch(request) {
        return {
          ok: true,
          response: {
            results: request.records.map((record) => {
              const payload = record.payload as { description?: string };
              return payload.description === 'Rechazada'
                ? {
                    recordId: record.recordId,
                    status: 'rejected' as const,
                    reason: 'FORCED_REJECTION',
                  }
                : { recordId: record.recordId, status: 'accepted' as const };
            }),
          },
        };
      },
    };

    const engine = new RealSyncEngine(db, api, 'device-1');
    await engine.sync(now);

    expect(
      await db.outbox.where('status').equals('synced').count(),
    ).toBeGreaterThanOrEqual(2);
    expect(await db.outbox.where('status').equals('rejected').count()).toBe(1);
    await db.delete();
  });

  it('preserves the original rejection when a retried record is reported as duplicate', async () => {
    const db = newDb();
    const services = await createServices(db);
    await services.settings.set('serverUrl', 'http://localhost:3000');
    const user = (await services.users.getById('user-cashier-ana'))!;
    const opened = await services.sessions.openSession(
      user,
      10000,
      '2026-11-21T12:00:00Z',
    );
    if (!opened.ok) throw new Error('session not opened');
    await services.movements.add(
      user,
      opened.value,
      {
        type: 'sale',
        amountMinor: 200,
        currency: 'CUP',
        description: 'Venta rechazada',
        occurredAt: '2026-11-21T13:00:00Z',
      },
      now,
    );

    const api: ApiClient = {
      async sendBatch(request) {
        return {
          ok: true,
          response: {
            results: request.records.map((record) =>
              record.kind === 'movement'
                ? {
                    recordId: record.recordId,
                    status: 'duplicate' as const,
                    reason: 'AMOUNT_OVER_LIMIT',
                    originalResult: 'rejected' as const,
                  }
                : { recordId: record.recordId, status: 'accepted' as const },
            ),
          },
        };
      },
    };

    await new RealSyncEngine(db, api, 'device-1').sync(now);

    expect(await db.outbox.where('status').equals('synced').count()).toBe(1);
    expect(await db.outbox.where('status').equals('rejected').count()).toBe(1);
    await db.delete();
  });

  it('stops on network failure and schedules backoff', async () => {
    const db = newDb();
    const services = await createServices(db);
    await services.settings.set('serverUrl', 'http://localhost:3000');
    const user = (await services.users.getById('user-cashier-ana'))!;
    const opened = await services.sessions.openSession(
      user,
      0,
      '2026-11-21T12:00:00Z',
    );
    if (!opened.ok) throw new Error('session not opened');

    const api: ApiClient = {
      async sendBatch() {
        return { ok: false, kind: 'network', detail: 'sin conexión' };
      },
    };
    await new RealSyncEngine(db, api, 'device-1').sync(now);

    const entry = await db.outbox.orderBy('sequence').first();
    expect(entry).toMatchObject({
      status: 'error',
      attempts: 1,
      lastError: { code: 'network', detail: 'sin conexión' },
    });
    expect(entry?.nextAttemptAt).toBe('2026-11-21T16:00:01.000Z');
    await db.delete();
  });

  it('recovers interrupted syncing entries to pending', async () => {
    const db = newDb();
    await createServices(db);
    await db.outbox.add({
      id: 'entry-1',
      sequence: 1,
      entityType: 'session',
      entityId: 'missing',
      operation: 'create',
      status: 'syncing',
      attempts: 1,
      lastAttemptAt: null,
      nextAttemptAt: null,
      lastError: null,
      serverResult: null,
      createdAt: now,
      updatedAt: now,
    });

    await new RealSyncEngine(
      db,
      {
        async sendBatch() {
          return { ok: true, response: { results: [] } };
        },
      },
      'device-1',
    ).sync(now);
    expect(await db.outbox.get('entry-1')).toMatchObject({ status: 'pending' });
    await db.delete();
  });

  it('uses the documented backoff sequence', () => {
    expect([1, 2, 3, 4, 5].map(backoffSeconds)).toEqual([1, 5, 30, 120, 600]);
    expect(nextAttemptAt(2, now)).toBe('2026-11-21T16:00:05.000Z');
  });
});
