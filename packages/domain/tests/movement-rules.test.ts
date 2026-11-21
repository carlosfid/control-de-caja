import { describe, expect, it } from 'vitest';
import { summarizeSession, validateNewMovement, type Movement } from '../src';
import { buildSession, buildUser } from '../src/testing/builders';

const now = '2026-11-20T16:00:00Z';

function input(overrides: Record<string, unknown> = {}) {
  return {
    type: 'sale' as const,
    amountMinor: 1000,
    currency: 'CUP',
    description: 'Venta mostrador',
    occurredAt: '2026-11-20T13:00:00Z',
    ...overrides,
  };
}

describe('E3 movement rules', () => {
  it('returns multiple movement errors at once', () => {
    const result = validateNewMovement(input({ amountMinor: 0, description: 'x', currency: 'USD', occurredAt: '2026-11-21T16:00:00Z' }), {
      user: buildUser(), session: buildSession({ openedAt: '2026-11-20T12:00:00Z' }), now,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });

  it('rejects salary payment for a cashier', () => {
    const result = validateNewMovement(input({ type: 'salary_payment' }), {
      user: buildUser(), session: buildSession({ openedAt: '2026-11-20T12:00:00Z' }), now,
    });
    expect(result).toMatchObject({ ok: false, errors: [{ code: 'MOVEMENT_TYPE_NOT_ALLOWED' }] });
  });

  it('rejects movement in a closed session', () => {
    const result = validateNewMovement(input(), {
      user: buildUser(), session: buildSession({ status: 'closed', openedAt: '2026-11-20T12:00:00Z' }), now,
    });
    expect(result).toMatchObject({ ok: false, errors: expect.arrayContaining([{ code: 'SESSION_NOT_OPEN' }]) });
  });

  it('calculates balance and counts types and sync states', () => {
    const session = buildSession({ openingBalanceMinor: 10000 });
    const movements = [
      { ...buildMovement(), direction: 'in' as const, amountMinor: 5000, type: 'sale', syncStatus: 'synced' as const },
      { ...buildMovement(), id: 'b', direction: 'out' as const, amountMinor: 3000, type: 'refund', syncStatus: 'rejected' as const },
    ];
    expect(summarizeSession(session, movements)).toEqual({
      incomeMinor: 5000,
      expenseMinor: 3000,
      expectedBalanceMinor: 12000,
      byType: { sale: 1, refund: 1 },
      bySyncStatus: { synced: 1, rejected: 1 },
    });
  });

  function buildMovement(): Movement {
    return {
      id: 'a', sessionId: 's', userId: 'u', type: 'sale', direction: 'in', amountMinor: 100,
      currency: 'CUP', description: 'demo', occurredAt: now, createdAt: now, reference: null,
      counterparty: null, counterpartyRegisterId: null, reversalOf: null, reversedBy: null,
      reversalReason: null, syncStatus: 'local',
    };
  }
});
