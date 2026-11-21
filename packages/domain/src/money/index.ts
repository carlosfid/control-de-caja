import { ERROR_CODES } from '../errors';
import { MAX_AMOUNT_MINOR } from '../config';
import { failure, success, type Result } from '../result';

export function parseAmount(text: string, maxMinor = MAX_AMOUNT_MINOR): Result<number> {
  const normalized = text.trim();
  if (!normalized) return failure({ code: ERROR_CODES.AMOUNT_REQUIRED, field: 'amountMinor' });
  if (!Number.isSafeInteger(maxMinor) || maxMinor < 0) {
    throw new RangeError('maxMinor debe ser un entero seguro no negativo');
  }
  if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(normalized)) {
    return failure({ code: ERROR_CODES.AMOUNT_FORMAT, field: 'amountMinor' });
  }
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [wholeText, fractionText = ''] = unsigned.split(',');
  const whole = BigInt(wholeText.replaceAll('.', ''));
  const minor = whole * 100n + BigInt(fractionText.padEnd(2, '0') || '0');
  if (negative && minor > 0n) {
    return failure({ code: ERROR_CODES.AMOUNT_NOT_POSITIVE, field: 'amountMinor' });
  }
  if (minor > BigInt(maxMinor)) {
    return failure({ code: ERROR_CODES.AMOUNT_TOO_LARGE, field: 'amountMinor', params: { maxMinor } });
  }
  return success(Number(minor));
}

export function formatAmount(minor: number): string {
  if (!Number.isSafeInteger(minor) || minor < 0) {
    throw new RangeError('minor debe ser un entero seguro no negativo');
  }
  const value = BigInt(minor);
  const whole = (value / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fraction = (value % 100n).toString().padStart(2, '0');
  return `${whole},${fraction}`;
}

export function formatSignedAmount(minor: number): string {
  if (!Number.isSafeInteger(minor)) {
    throw new RangeError('minor debe ser un entero seguro');
  }
  const formatted = formatAmount(Math.abs(minor));
  return minor < 0 ? `− ${formatted}` : `+ ${formatted}`;
}
