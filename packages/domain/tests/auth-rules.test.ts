import { describe, expect, it } from 'vitest';
import { getPinLockRemaining, validatePinFormat } from '../src/rules/auth-rules';

describe('PIN rules', () => {
  it('accepts four digits', () => expect(validatePinFormat('1234').ok).toBe(true));
  it('rejects malformed PINs', () => expect(validatePinFormat('12a4')).toMatchObject({ ok: false }));
  it('returns remaining lock seconds', () => {
    expect(getPinLockRemaining('2026-01-01T00:01:00Z', '2026-01-01T00:00:30Z')).toBe(30);
  });
});
