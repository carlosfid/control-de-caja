import { describe, expect, it } from 'vitest';
import { formatAmount, formatSignedAmount, parseAmount } from '../src/money';

function parsed(text: string): number | undefined {
  const result = parseAmount(text);
  return result.ok ? result.value : undefined;
}

describe('money parsing and formatting', () => {
  it.each([
    ['0', 0],
    ['12', 1200],
    ['12,5', 1250],
    ['12,50', 1250],
    ['1.234', 123400],
    ['1.234,56', 123456],
    ['1.234.567.890,12', 123456789012],
  ])('parses %s to minor units', (text, expected) => {
    expect(parseAmount(text)).toEqual({ ok: true, value: expected });
  });

  it('requires an amount', () => {
    expect(parseAmount('')).toMatchObject({
      ok: false,
      errors: [{ code: 'AMOUNT_REQUIRED' }],
    });
  });

  it.each(['abc', '12.5', '1.23', '1.234,567', '12,', '1,2.3'])(
    'rejects malformed amount %s',
    (text) => {
      expect(parseAmount(text)).toMatchObject({ ok: false, errors: [{ code: 'AMOUNT_FORMAT' }] });
    },
  );

  it('rejects negative values and values above the configured limit', () => {
    expect(parseAmount('-1,00')).toMatchObject({
      ok: false,
      errors: [{ code: 'AMOUNT_NOT_POSITIVE' }],
    });
    expect(parseAmount('10,01', 1000)).toMatchObject({
      ok: false,
      errors: [{ code: 'AMOUNT_TOO_LARGE' }],
    });
  });

  it.each([0, 1, 12345, 123456789012, Number.MAX_SAFE_INTEGER])(
    'round-trips %i minor units',
    (minor) => {
      expect(parsed(formatAmount(minor))).toBe(minor);
    },
  );

  it('formats signed values with the specified separators', () => {
    expect(formatAmount(123450)).toBe('1.234,50');
    expect(formatSignedAmount(10000)).toBe('+ 100,00');
    expect(formatSignedAmount(-5000)).toBe('− 50,00');
  });
});
