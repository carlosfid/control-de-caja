import { ERROR_CODES, PIN_MAX_FAILURES, PIN_LOCK_SECONDS, failure, success, validatePinFormat, getPinLockRemaining, nextPinFailures, type Result, type User } from '@caja/domain';
import type { CajaDatabase } from '../db';
import { verifyPinHash } from '../pin-hash';
import { writeAudit } from '../audit-log';

export interface UserRepository {
  listDemoUsers(): Promise<User[]>;
  getById(id: string): Promise<User | undefined>;
  verifyPin(userId: string, pin: string, now?: string): Promise<Result<User>>;
}

interface LockState { failures: number; lockUntilAt: string | null; }
const lockKey = (userId: string) => `pinLock:${userId}`;

export function createUserRepository(db: CajaDatabase): UserRepository {
  return {
    async listDemoUsers() {
      const users = await db.users.toArray();
      return users.map(({ pinHash: _pinHash, pinSalt: _pinSalt, ...user }) => user);
    },
    async getById(id) {
      const stored = await db.users.get(id);
      if (!stored) return undefined;
      const { pinHash: _pinHash, pinSalt: _pinSalt, ...user } = stored;
      return user;
    },
    async verifyPin(userId, pin, now = new Date().toISOString()) {
      const format = validatePinFormat(pin);
      if (!format.ok) return format;
      const stored = await db.users.get(userId);
      if (!stored) return failure({ code: ERROR_CODES.USER_NOT_FOUND });
      const lockSetting = await db.settings.get(lockKey(userId));
      const lock: LockState = lockSetting?.value ? JSON.parse(lockSetting.value) : { failures: 0, lockUntilAt: null };
      const remaining = getPinLockRemaining(lock.lockUntilAt, now);
      if (remaining > 0) return failure({ code: ERROR_CODES.PIN_LOCKED, params: { remainingSeconds: remaining } });
      const valid = await verifyPinHash(pin, stored.pinSalt, stored.pinHash);
      if (!valid) {
        const failures = nextPinFailures(lock.failures);
        const shouldLock = failures >= PIN_MAX_FAILURES;
        const lockUntilAt = shouldLock ? new Date(Date.parse(now) + PIN_LOCK_SECONDS * 1000).toISOString() : null;
        await db.settings.put({ key: lockKey(userId), value: JSON.stringify({ failures: shouldLock ? 0 : failures, lockUntilAt }) });
        await writeAudit(db, { userId, action: 'login_failed', entityType: 'user', entityId: userId, details: { remainingAttempts: Math.max(0, PIN_MAX_FAILURES - failures) } });
        return shouldLock
          ? failure({ code: ERROR_CODES.PIN_LOCKED, params: { remainingSeconds: PIN_LOCK_SECONDS } })
          : failure({ code: ERROR_CODES.PIN_WRONG, params: { remainingAttempts: PIN_MAX_FAILURES - failures } });
      }
      await db.settings.put({ key: lockKey(userId), value: JSON.stringify({ failures: 0, lockUntilAt: null }) });
      await db.settings.put({ key: 'activeUserId', value: userId });
      await writeAudit(db, { userId, action: 'login_success', entityType: 'user', entityId: userId, details: {} });
      const { pinHash: _pinHash, pinSalt: _pinSalt, ...user } = stored;
      return success(user);
    },
  };
}
