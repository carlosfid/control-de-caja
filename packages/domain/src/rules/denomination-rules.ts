import { ERROR_CODES } from '../errors';
import { failure, success, type Result } from '../result';

export const MAX_DENOMINATION_COUNT = 100000;

export function totalFromDenominations(counts: Record<string, unknown>): Result<number> {
  let total = 0;
  for (const [denominationText, count] of Object.entries(counts)) {
    const denomination = Number(denominationText);
    if (
      !Number.isSafeInteger(denomination) ||
      denomination <= 0 ||
      typeof count !== 'number' ||
      !Number.isSafeInteger(count) ||
      count < 0 ||
      count > MAX_DENOMINATION_COUNT
    ) {
      return failure({ code: ERROR_CODES.DENOMINATION_INVALID });
    }
    const amount = denomination * count;
    if (!Number.isSafeInteger(amount)) {
      return failure({ code: ERROR_CODES.DENOMINATION_INVALID });
    }
    total += amount;
  }
  if (!Number.isSafeInteger(total)) return failure({ code: ERROR_CODES.DENOMINATION_INVALID });
  return success(total);
}
