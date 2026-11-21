import { ERROR_CODES } from '../errors';
import { failure, success, type Result } from '../result';
import type { CashSession, User } from '../types';

export type VarianceKind = 'balanced' | 'shortage' | 'surplus';

export interface VarianceResult {
  varianceMinor: number;
  kind: VarianceKind;
}

export function computeVariance(expectedMinor: number, countedMinor: number): VarianceResult {
  const varianceMinor = countedMinor - expectedMinor;
  return {
    varianceMinor,
    kind: varianceMinor === 0 ? 'balanced' : varianceMinor < 0 ? 'shortage' : 'surplus',
  };
}

export function validateClose(
  user: User,
  session: CashSession,
  countedMinor: unknown,
  note: string | null,
  now: string,
): Result<void> {
  void now;
  const errors = [];

  if (session.status !== 'open') {
    errors.push({ code: ERROR_CODES.SESSION_ALREADY_CLOSED });
  }
  if (session.userId !== user.id) {
    errors.push({ code: ERROR_CODES.SESSION_NOT_OWNED });
  }
  if (typeof countedMinor !== 'number' || !Number.isSafeInteger(countedMinor) || countedMinor < 0) {
    errors.push({ code: ERROR_CODES.COUNTED_INVALID, field: 'countedBalanceMinor' as const });
  }

  if (
    typeof countedMinor === 'number' &&
    Number.isSafeInteger(countedMinor) &&
    countedMinor >= 0
  ) {
    const expectedMinor = session.expectedBalanceMinor ?? session.openingBalanceMinor;
    const variance = computeVariance(expectedMinor, countedMinor);
    if (variance.kind !== 'balanced' && (!note || note.trim().length < 3)) {
      errors.push({ code: ERROR_CODES.VARIANCE_NOTE_REQUIRED, field: 'varianceNote' as const });
    }
  }

  return errors.length ? failure(...errors) : success(undefined);
}
