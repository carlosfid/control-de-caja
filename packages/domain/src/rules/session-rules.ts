import { ERROR_CODES } from '../errors';
import { failure, success, type Result } from '../result';
import type { CashSession, User } from '../types';

export function validateOpenSession(
  user: User,
  openingBalanceMinor: unknown,
  existingOpenSession: CashSession | null | undefined,
  now: string,
): Result<void> {
  void now;
  const errors = [];

  if (
    (user.role !== 'cashier' && user.role !== 'supervisor') ||
    !user.registerId
  ) {
    errors.push({ code: ERROR_CODES.PERMISSION_DENIED });
  }
  if (
    typeof openingBalanceMinor !== 'number' ||
    !Number.isSafeInteger(openingBalanceMinor) ||
    openingBalanceMinor < 0
  ) {
    errors.push({
      code: ERROR_CODES.OPENING_BALANCE_INVALID,
      field: 'openingBalanceMinor',
    });
  }
  if (existingOpenSession?.status === 'open') {
    errors.push({ code: ERROR_CODES.SESSION_ALREADY_OPEN });
  }

  return errors.length > 0 ? { ok: false, errors } : success(undefined);
}
