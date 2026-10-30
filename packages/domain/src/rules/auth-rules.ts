import { ERROR_CODES } from '../errors';
import { failure, success, type Result } from '../result';

export const PIN_MAX_FAILURES = 5;
export const PIN_LOCK_SECONDS = 60;

export function validatePinFormat(pin: string): Result<string> {
  return /^\d{4}$/.test(pin)
    ? success(pin)
    : failure({ code: ERROR_CODES.PIN_INVALID_FORMAT, field: 'pin' });
}

export function getPinLockRemaining(lockUntilAt: string | null, now: string): number {
  if (!lockUntilAt) return 0;
  return Math.max(0, Math.ceil((Date.parse(lockUntilAt) - Date.parse(now)) / 1000));
}

export function nextPinFailures(failures: number): number {
  return Math.min(failures + 1, PIN_MAX_FAILURES);
}
