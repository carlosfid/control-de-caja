import { describe, expect, it } from 'vitest';
import { isSyncRequest, type CashSession, type SyncRequest } from '../src';

const session: CashSession = {
  id: 'session-1',
  userId: 'user-cashier-ana',
  registerId: 'reg-01',
  currency: 'CUP',
  openedAt: '2026-11-23T12:00:00.000Z',
  openingBalanceMinor: 1000,
  status: 'open',
  closedAt: null,
  countedBalanceMinor: null,
  expectedBalanceMinor: null,
  varianceMinor: null,
  varianceNote: null,
  closedByUserId: null,
  denominationBreakdown: null,
  syncStatus: 'pending',
};

const validRequest: SyncRequest = {
  deviceId: 'device-1',
  sentAt: '2026-11-23T12:01:00.000Z',
  records: [
    {
      recordId: 'record-1',
      kind: 'session',
      operation: 'upsert',
      payload: session,
    },
  ],
};

describe('sync contract validation', () => {
  it('accepts a structurally valid request', () => {
    expect(isSyncRequest(validRequest)).toBe(true);
  });

  it('rejects malformed, oversized, and additional fields', () => {
    expect(isSyncRequest({ ...validRequest, sentAt: 'tomorrow' })).toBe(false);
    expect(isSyncRequest({ ...validRequest, unexpected: true })).toBe(false);
    expect(
      isSyncRequest({
        ...validRequest,
        records: Array.from({ length: 101 }, (_, index) => ({
          recordId: `record-${index}`,
          kind: 'session',
          operation: 'upsert',
          payload: session,
        })),
      }),
    ).toBe(false);
    expect(
      isSyncRequest({
        ...validRequest,
        records: [
          { ...validRequest.records[0], payload: { ...session, pin: '1234' } },
        ],
      }),
    ).toBe(false);
  });
});
