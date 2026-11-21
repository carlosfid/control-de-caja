import { describe, expect, it } from 'vitest';
import { failure, success } from '../src/result';

describe('Result', () => {
  it('creates success values', () => {
    expect(success(42)).toEqual({ ok: true, value: 42 });
  });

  it('returns a list of domain errors', () => {
    expect(failure({ code: 'AMOUNT_REQUIRED', field: 'amountMinor' })).toEqual({
      ok: false,
      errors: [{ code: 'AMOUNT_REQUIRED', field: 'amountMinor' }],
    });
  });
});
