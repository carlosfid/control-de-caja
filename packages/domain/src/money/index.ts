import { failure, success, type Result } from '../result';
import { ERROR_CODES } from '../errors';

export function parseAmount(text: string): Result<number> {
  const normalized = text.trim().replace(',', '.');
  if (!normalized) return failure({ code: ERROR_CODES.AMOUNT_REQUIRED, field: 'amountMinor' });
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return failure({ code: ERROR_CODES.AMOUNT_FORMAT, field: 'amountMinor' });
  }
  const minor = Math.round(Number(normalized) * 100);
  if (minor <= 0) return failure({ code: ERROR_CODES.AMOUNT_NOT_POSITIVE, field: 'amountMinor' });
  if (!Number.isSafeInteger(minor)) return failure({ code: ERROR_CODES.AMOUNT_TOO_LARGE, field: 'amountMinor' });
  return success(minor);
}

export function formatAmount(minor: number, locale = 'es-CU'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'CUP' }).format(minor / 100);
}

export function formatSignedAmount(minor: number, locale = 'es-CU'): string {
  const formatted = formatAmount(Math.abs(minor), locale);
  return minor < 0 ? `-${formatted}` : `+${formatted}`;
}
