import { ERROR_CODES } from '../errors';
import { failure, success, type Result } from '../result';
import type { CashSession, Movement, User } from '../types';

export function validateReversal(
  user: User,
  original: Movement,
  session: CashSession,
  reason: string,
  now: string,
): Result<void> {
  void now;
  const errors = [];

  if (session.status !== 'open') errors.push({ code: ERROR_CODES.SESSION_NOT_OPEN });
  if (session.userId !== user.id) errors.push({ code: ERROR_CODES.SESSION_NOT_OWNED });
  if (session.id !== original.sessionId) errors.push({ code: ERROR_CODES.MOVEMENT_NOT_FOUND });
  if (!reason || reason.trim().length < 3) {
    errors.push({ code: ERROR_CODES.REVERSAL_REASON_REQUIRED, field: 'varianceNote' as const });
  }
  if (original.reversedBy) errors.push({ code: ERROR_CODES.REVERSAL_ALREADY_DONE });
  if (original.reversalOf || original.type === 'reversal') {
    errors.push({ code: ERROR_CODES.REVERSAL_OF_REVERSAL });
  }

  return errors.length ? failure(...errors) : success(undefined);
}
