import { describe, expect, it } from 'vitest';
import { buildServer } from '../src/index';

describe('POST /sync', () => {
  it('accepts a session, rejects unknown session movements and is idempotent', async () => {
    const server = buildServer({ amountLimitMinor: 10000 });

    const session = {
      recordId: 'session-record-1',
      kind: 'session',
      operation: 'upsert',
      payload: {
        id: 'session-1', userId: 'user-cashier-ana', registerId: 'reg-01', currency: 'CUP',
        openedAt: '2026-11-21T12:00:00Z', openingBalanceMinor: 10000, status: 'open',
        closedAt: null, countedBalanceMinor: null, expectedBalanceMinor: null, varianceMinor: null,
        varianceNote: null, closedByUserId: null, denominationBreakdown: null,
      },
    };

    const auth = await server.inject({ method: 'POST', url: '/auth/token', payload: { userId: 'user-cashier-ana', pin: '1234' } });
    const token = auth.json().token as string;

    const first = await server.inject({
      method: 'POST', url: '/sync', headers: { authorization: `Bearer ${token}` },
      payload: { deviceId: 'device-1', sentAt: '2026-11-21T12:00:00Z', records: [session] },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ results: [{ recordId: 'session-record-1', status: 'accepted' }] });

    const duplicate = await server.inject({
      method: 'POST', url: '/sync', headers: { authorization: `Bearer ${token}` },
      payload: { deviceId: 'device-1', sentAt: '2026-11-21T12:01:00Z', records: [session] },
    });
    expect(duplicate.json()).toMatchObject({ results: [{ recordId: 'session-record-1', status: 'duplicate' }] });

    const movement = {
      recordId: 'movement-record-1', kind: 'movement', operation: 'upsert',
      payload: {
        id: 'movement-1', sessionId: 'session-1', userId: 'user-cashier-ana', type: 'sale', direction: 'in',
        amountMinor: 20000, currency: 'CUP', description: 'Venta grande', occurredAt: '2026-11-21T13:00:00Z',
        createdAt: '2026-11-21T13:00:00Z', reference: null, counterparty: null, counterpartyRegisterId: null,
        reversalOf: null, reversedBy: null, reversalReason: null,
      },
    };
    const overLimit = await server.inject({
      method: 'POST', url: '/sync', headers: { authorization: `Bearer ${token}` },
      payload: { deviceId: 'device-1', sentAt: '2026-11-21T13:00:00Z', records: [movement] },
    });
    expect(overLimit.json()).toMatchObject({ results: [{ recordId: 'movement-record-1', status: 'rejected', reason: 'AMOUNT_OVER_LIMIT' }] });

    await server.close();
  });

  it('returns 401 without a valid token', async () => {
    const server = buildServer();
    const response = await server.inject({ method: 'POST', url: '/sync', payload: { deviceId: 'd', sentAt: '2026-11-21T12:00:00Z', records: [] } });
    expect(response.statusCode).toBe(401);
    await server.close();
  });

  it('rejects malformed payloads', async () => {
    const server = buildServer();
    const auth = await server.inject({ method: 'POST', url: '/auth/token', payload: { userId: 'user-cashier-ana', pin: '1234' } });
    const token = auth.json().token as string;
    const response = await server.inject({ method: 'POST', url: '/sync', headers: { authorization: `Bearer ${token}` }, payload: { records: [] } });
    expect(response.statusCode).toBe(400);
    await server.close();
  });
});
