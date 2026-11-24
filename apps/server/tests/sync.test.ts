import { describe, expect, it } from 'vitest';
import { buildServer } from '../src/index';

const sessionRecord = {
  recordId: 'session-record-1',
  kind: 'session',
  operation: 'upsert',
  payload: {
    id: 'session-1',
    userId: 'user-cashier-ana',
    registerId: 'reg-01',
    currency: 'CUP',
    openedAt: '2026-11-23T12:00:00.000Z',
    openingBalanceMinor: 10_000,
    status: 'open',
    closedAt: null,
    countedBalanceMinor: null,
    expectedBalanceMinor: null,
    varianceMinor: null,
    varianceNote: null,
    closedByUserId: null,
    denominationBreakdown: null,
    syncStatus: 'pending',
  },
};

function movementRecord(overrides: Record<string, unknown> = {}) {
  return {
    recordId: 'movement-record-1',
    kind: 'movement',
    operation: 'upsert',
    payload: {
      id: 'movement-1',
      sessionId: 'session-1',
      userId: 'user-cashier-ana',
      type: 'sale',
      direction: 'in',
      amountMinor: 500,
      currency: 'CUP',
      description: 'Venta en efectivo',
      occurredAt: '2026-11-23T12:30:00.000Z',
      createdAt: '2026-11-23T12:30:00.000Z',
      reference: null,
      counterparty: null,
      counterpartyRegisterId: null,
      reversalOf: null,
      reversedBy: null,
      reversalReason: null,
      syncStatus: 'pending',
      ...overrides,
    },
  };
}

async function getToken(
  server: ReturnType<typeof buildServer>,
  userId = 'user-cashier-ana',
  pin = '1234',
): Promise<string> {
  const response = await server.inject({
    method: 'POST',
    url: '/auth/token',
    payload: { userId, pin },
  });
  return response.json().token as string;
}

function syncPayload(records: unknown[]) {
  return { deviceId: 'device-1', sentAt: '2026-11-23T12:31:00.000Z', records };
}

function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}

describe('POST /sync', () => {
  it('stores sessions and returns original results for duplicate record ids', async () => {
    const server = buildServer();
    const token = await getToken(server);
    const payload = syncPayload([sessionRecord]);

    const first = await server.inject({
      method: 'POST',
      url: '/sync',
      headers: authHeader(token),
      payload,
    });
    const duplicate = await server.inject({
      method: 'POST',
      url: '/sync',
      headers: authHeader(token),
      payload,
    });

    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({
      results: [{ recordId: 'session-record-1', status: 'accepted' }],
    });
    expect(duplicate.json()).toMatchObject({
      results: [{ recordId: 'session-record-1', status: 'duplicate' }],
    });
    expect(
      (await server.inject({ method: 'GET', url: '/demo/state' })).json(),
    ).toMatchObject({ total: 2, accepted: 1, duplicates: 1 });
    await server.close();
  });

  it('processes each record independently and enforces the configured amount limit', async () => {
    const server = buildServer({ amountLimitMinor: 1000 });
    const token = await getToken(server);
    const response = await server.inject({
      method: 'POST',
      url: '/sync',
      headers: authHeader(token),
      payload: syncPayload([
        sessionRecord,
        {
          ...movementRecord({ id: 'too-large', amountMinor: 1001 }),
          recordId: 'large-record',
        },
        {
          ...movementRecord({ id: 'no-session', sessionId: 'unknown-session' }),
          recordId: 'unknown-session-record',
        },
      ]),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      results: [
        { recordId: 'session-record-1', status: 'accepted' },
        {
          recordId: 'large-record',
          status: 'rejected',
          reason: 'AMOUNT_OVER_LIMIT',
        },
        {
          recordId: 'unknown-session-record',
          status: 'rejected',
          reason: 'SESSION_NOT_FOUND',
        },
      ],
    });
    expect(
      (await server.inject({ method: 'GET', url: '/demo/state' })).json(),
    ).toMatchObject({ total: 3, accepted: 1, rejected: 2 });
    const duplicateRejected = await server.inject({
      method: 'POST',
      url: '/sync',
      headers: authHeader(token),
      payload: syncPayload([
        {
          ...movementRecord({ id: 'too-large', amountMinor: 1001 }),
          recordId: 'large-record',
        },
      ]),
    });
    expect(duplicateRejected.json()).toMatchObject({
      results: [
        {
          recordId: 'large-record',
          status: 'duplicate',
          reason: 'AMOUNT_OVER_LIMIT',
          originalResult: 'rejected',
        },
      ],
    });
    expect(
      (await server.inject({ method: 'GET', url: '/demo/state' })).json(),
    ).toMatchObject({ total: 4, accepted: 1, duplicates: 1, rejected: 2 });
    await server.close();
  });

  it('returns semantic payload, type, reversal, and forced-rejection reasons per record', async () => {
    const server = buildServer();
    const token = await getToken(server);
    await server.inject({
      method: 'POST',
      url: '/sync',
      headers: authHeader(token),
      payload: syncPayload([sessionRecord]),
    });

    const invalidBalance = {
      ...sessionRecord,
      recordId: 'negative-opening-balance',
      payload: {
        ...sessionRecord.payload,
        id: 'negative-session',
        openingBalanceMinor: -1,
      },
    };
    const invalidType = {
      ...movementRecord({ id: 'invalid-type', type: 'not-a-type' }),
      recordId: 'invalid-type-record',
    };
    const unknownReversal = {
      ...movementRecord({
        id: 'unknown-reversal',
        type: 'reversal',
        direction: 'out',
        reversalOf: 'movement-does-not-exist',
        reversalReason: 'Correction test',
      }),
      recordId: 'unknown-reversal-record',
    };
    const invalid = await server.inject({
      method: 'POST',
      url: '/sync',
      headers: authHeader(token),
      payload: syncPayload([invalidBalance, invalidType, unknownReversal]),
    });
    expect(invalid.json()).toMatchObject({
      results: [
        {
          recordId: 'negative-opening-balance',
          status: 'rejected',
          reason: 'INVALID_PAYLOAD',
        },
        {
          recordId: 'invalid-type-record',
          status: 'rejected',
          reason: 'INVALID_TYPE',
        },
        {
          recordId: 'unknown-reversal-record',
          status: 'rejected',
          reason: 'REVERSAL_TARGET_UNKNOWN',
        },
      ],
    });

    await server.inject({
      method: 'POST',
      url: '/demo/config',
      payload: { rejectNextN: 1 },
    });
    const forced = await server.inject({
      method: 'POST',
      url: '/sync',
      headers: authHeader(token),
      payload: syncPayload([movementRecord({ id: 'forced-rejection' })]),
    });
    expect(forced.json()).toMatchObject({
      results: [{ status: 'rejected', reason: 'FORCED_REJECTION' }],
    });
    await server.close();
  });

  it('rejects movements after a session closes on the server', async () => {
    const server = buildServer();
    const token = await getToken(server);
    const closedSession = {
      ...sessionRecord,
      recordId: 'session-close-record',
      payload: {
        ...sessionRecord.payload,
        status: 'closed',
        closedAt: '2026-11-23T13:00:00.000Z',
        countedBalanceMinor: 10_000,
        expectedBalanceMinor: 10_000,
        varianceMinor: 0,
        closedByUserId: 'user-cashier-ana',
      },
    };
    await server.inject({
      method: 'POST',
      url: '/sync',
      headers: authHeader(token),
      payload: syncPayload([sessionRecord, closedSession]),
    });

    const response = await server.inject({
      method: 'POST',
      url: '/sync',
      headers: authHeader(token),
      payload: syncPayload([movementRecord({ id: 'late-movement' })]),
    });
    expect(response.json()).toMatchObject({
      results: [{ status: 'rejected', reason: 'SESSION_CLOSED_SERVER' }],
    });
    await server.close();
  });

  it('rejects attempts to sync records owned by another user', async () => {
    const server = buildServer();
    const token = await getToken(server);
    const alteredRecord = {
      ...sessionRecord,
      payload: { ...sessionRecord.payload, userId: 'user-supervisor-luis' },
    };
    const response = await server.inject({
      method: 'POST',
      url: '/sync',
      headers: authHeader(token),
      payload: syncPayload([alteredRecord]),
    });

    expect(response.json()).toMatchObject({
      results: [{ status: 'rejected', reason: 'UNAUTHORIZED' }],
    });
    await server.close();
  });

  it('returns 401 without a valid token', async () => {
    const server = buildServer();
    const response = await server.inject({
      method: 'POST',
      url: '/sync',
      payload: syncPayload([]),
    });
    expect(response.statusCode).toBe(401);
    await server.close();
  });

  it('rejects malformed or oversized contract fields', async () => {
    const server = buildServer();
    const token = await getToken(server);
    const invalid = await server.inject({
      method: 'POST',
      url: '/sync',
      headers: authHeader(token),
      payload: { ...syncPayload([sessionRecord]), sentAt: 'not-a-date' },
    });
    const secretLeak = await server.inject({
      method: 'POST',
      url: '/sync',
      headers: authHeader(token),
      payload: syncPayload([
        {
          ...sessionRecord,
          payload: { ...sessionRecord.payload, pin: '1234' },
        },
      ]),
    });

    expect(invalid.statusCode).toBe(400);
    expect(secretLeak.statusCode).toBe(400);
    await server.close();
  });

  it('returns HTTP 503 for configured temporary failures without processing the request', async () => {
    const server = buildServer();
    const token = await getToken(server);
    await server.inject({
      method: 'POST',
      url: '/demo/config',
      payload: { failNextN: 1 },
    });

    const payload = syncPayload([sessionRecord]);
    const failed = await server.inject({
      method: 'POST',
      url: '/sync',
      headers: authHeader(token),
      payload,
    });
    const retry = await server.inject({
      method: 'POST',
      url: '/sync',
      headers: authHeader(token),
      payload,
    });

    expect(failed.statusCode).toBe(503);
    expect(retry.json()).toMatchObject({ results: [{ status: 'accepted' }] });
    await server.close();
  });

  it('processes a request before losing its response so its retry is a duplicate', async () => {
    const server = buildServer();
    const address = await server.listen({ host: '127.0.0.1', port: 0 });
    const token = await getToken(server);
    await server.inject({
      method: 'POST',
      url: '/demo/config',
      payload: { loseResponseNextN: 1 },
    });
    const payload = syncPayload([sessionRecord]);
    const request = () =>
      fetch(`${address}/sync`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

    await expect(request()).rejects.toThrow();
    const retry = await request();
    expect((await retry.json()).results).toMatchObject([
      { status: 'duplicate' },
    ]);
    expect(
      (await server.inject({ method: 'GET', url: '/demo/state' })).json(),
    ).toMatchObject({ total: 2, accepted: 1, duplicates: 1 });
    await server.close();
  });
});
