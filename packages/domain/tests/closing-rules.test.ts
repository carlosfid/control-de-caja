import { describe, expect, it } from 'vitest';
import { buildSession, buildUser } from '../src/testing/builders';
import { buildSessionReport, computeVariance, validateClose, totalFromDenominations } from '../src';
import type { Movement } from '../src';

describe('E4 closing rules', () => {
  it('calculates balanced, shortage and surplus', () => {
    expect(computeVariance(10000, 10000)).toEqual({ varianceMinor: 0, kind: 'balanced' });
    expect(computeVariance(10000, 9000)).toEqual({ varianceMinor: -1000, kind: 'shortage' });
    expect(computeVariance(10000, 12000)).toEqual({ varianceMinor: 2000, kind: 'surplus' });
  });

  it('requires a note for any difference', () => {
    const session = buildSession({ expectedBalanceMinor: 10000 });
    expect(validateClose(buildUser(), session, 9000, null, '2026-11-21T12:00:00Z')).toMatchObject({
      ok: false,
      errors: [{ code: 'VARIANCE_NOTE_REQUIRED', field: 'varianceNote' }],
    });
  });

  it('builds a coherent session report', () => {
    const session = buildSession({ openingBalanceMinor: 10000, status: 'closed', countedBalanceMinor: 13000, expectedBalanceMinor: 12000, varianceMinor: 1000, varianceNote: 'Conteo manual', closedByUserId: 'user-cashier-ana' });
    const movements: Movement[] = [{
      id: 'm1', sessionId: session.id, userId: 'user-cashier-ana', type: 'sale', direction: 'in',
      amountMinor: 2000, currency: 'CUP', description: 'Venta', occurredAt: '2026-11-21T13:00:00Z',
      createdAt: '2026-11-21T13:00:00Z', reference: null, counterparty: null, counterpartyRegisterId: null,
      reversalOf: null, reversedBy: null, reversalReason: null, syncStatus: 'local',
    }];
    expect(buildSessionReport(session, movements)).toMatchObject({
      incomeMinor: 2000, expenseMinor: 0, expectedBalanceMinor: 12000,
      countedBalanceMinor: 13000, varianceMinor: 1000, responsibleUserId: 'user-cashier-ana',
      byType: { sale: 1 },
    });
  });

  it('totals denominations and rejects invalid counts', () => {
    expect(totalFromDenominations({ '100': 2, '500': 3 })).toEqual({ ok: true, value: 1700 });
    expect(totalFromDenominations({ '100': -1 })).toMatchObject({ ok: false, errors: [{ code: 'DENOMINATION_INVALID' }] });
  });
});
