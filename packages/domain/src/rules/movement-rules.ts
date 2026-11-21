import { ERROR_CODES } from '../errors';
import { MAX_AMOUNT_MINOR, DESCRIPTION_MIN_LENGTH, DESCRIPTION_MAX_LENGTH } from '../config';
import { getMovementTypeDef } from '../movement-types';
import { canCreateMovementType } from '../permissions';
import { success, failure, type Result } from '../result';
import type { CashSession, FieldKey, MovementType, SyncStatus, User } from '../types';

export interface NewMovementInput {
  type: MovementType;
  amountMinor: unknown;
  currency: string;
  description: string;
  occurredAt: string;
  reference?: string | null;
  counterparty?: string | null;
  counterpartyRegisterId?: string | null;
}

export interface NewMovementContext {
  user: User;
  session: CashSession;
  now: string;
}

interface ValidationError { code: string; field?: FieldKey; params?: Record<string, string | number | boolean | null>; }

export function validateNewMovement(input: NewMovementInput, context: NewMovementContext): Result<void> {
  const errors: ValidationError[] = [];
  const { user, session, now } = context;
  const definition = getMovementTypeDef(input.type);

  if (session.status !== 'open') errors.push({ code: ERROR_CODES.SESSION_NOT_OPEN });
  if (session.userId !== user.id) errors.push({ code: ERROR_CODES.SESSION_NOT_OWNED });
  if (!definition) {
    errors.push({ code: ERROR_CODES.MOVEMENT_TYPE_INVALID, field: 'description' });
  } else if (!canCreateMovementType(user.role, input.type)) {
    errors.push({ code: ERROR_CODES.MOVEMENT_TYPE_NOT_ALLOWED });
  }

  if (typeof input.amountMinor !== 'number' || !Number.isSafeInteger(input.amountMinor)) {
    errors.push({ code: ERROR_CODES.AMOUNT_FORMAT, field: 'amountMinor' });
  } else if (input.amountMinor <= 0) {
    errors.push({ code: ERROR_CODES.AMOUNT_NOT_POSITIVE, field: 'amountMinor' });
  } else if (input.amountMinor > MAX_AMOUNT_MINOR) {
    errors.push({ code: ERROR_CODES.AMOUNT_TOO_LARGE, field: 'amountMinor', params: { maxMinor: MAX_AMOUNT_MINOR } });
  }

  const descriptionLength = input.description?.trim().length ?? 0;
  if (!input.description || descriptionLength === 0) {
    errors.push({ code: ERROR_CODES.FIELD_REQUIRED, field: 'description' });
  } else if (descriptionLength < DESCRIPTION_MIN_LENGTH) {
    errors.push({ code: ERROR_CODES.DESCRIPTION_TOO_SHORT, field: 'description', params: { min: DESCRIPTION_MIN_LENGTH } });
  } else if (descriptionLength > DESCRIPTION_MAX_LENGTH) {
    errors.push({ code: ERROR_CODES.DESCRIPTION_TOO_LONG, field: 'description', params: { max: DESCRIPTION_MAX_LENGTH } });
  }

  if (input.currency !== session.currency) {
    errors.push({ code: ERROR_CODES.CURRENCY_MISMATCH, field: 'currency' });
  }

  const occurredTime = Date.parse(input.occurredAt);
  const nowTime = Date.parse(now);
  const openedTime = Date.parse(session.openedAt);
  if (!Number.isFinite(occurredTime)) {
    errors.push({ code: ERROR_CODES.FIELD_REQUIRED, field: 'occurredAt' });
  } else {
    if (occurredTime > nowTime + 5 * 60 * 1000) errors.push({ code: ERROR_CODES.DATE_IN_FUTURE, field: 'occurredAt' });
    if (occurredTime < openedTime) errors.push({ code: ERROR_CODES.DATE_BEFORE_SESSION, field: 'occurredAt' });
  }

  for (const field of definition?.requiredFields ?? []) {
    if (field === 'occurredAt' || field === 'currency') continue;
    const value = input[field as keyof NewMovementInput];
    if (value === null || value === undefined || value === '') {
      errors.push({ code: ERROR_CODES.FIELD_REQUIRED, field: field as FieldKey });
    }
  }

  return errors.length ? failure(...errors) : success(undefined);
}
