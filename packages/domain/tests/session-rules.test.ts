import { describe, expect, it } from 'vitest';
import { validateOpenSession } from '../src/rules/session-rules';
import { buildSession, buildUser } from '../src/testing/builders';

const now = '2026-11-02T12:00:00.000Z';

describe('validateOpenSession', () => {
  it('allows a cashier to open a session with a zero balance', () => {
    expect(validateOpenSession(buildUser(), 0, null, now)).toEqual({ ok: true, value: undefined });
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, '100'])(
    'rejects invalid opening balance %s',
    (balance) => {
      expect(validateOpenSession(buildUser(), balance, null, now)).toMatchObject({
        ok: false,
        errors: [{ code: 'OPENING_BALANCE_INVALID', field: 'openingBalanceMinor' }],
      });
    },
  );

  it('prevents accountants from opening a session', () => {
    expect(validateOpenSession(buildUser({ role: 'accountant', registerId: null }), 100, null, now))
      .toMatchObject({ ok: false, errors: [{ code: 'PERMISSION_DENIED' }] });
  });

  it('prevents opening another session when one is already open', () => {
    expect(validateOpenSession(buildUser(), 100, buildSession(), now))
      .toMatchObject({ ok: false, errors: [{ code: 'SESSION_ALREADY_OPEN' }] });
  });
});
