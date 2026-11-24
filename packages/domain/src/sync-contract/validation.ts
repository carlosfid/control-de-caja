import type { CashSession, Movement } from '../types';
import type { SyncRequest } from './index';

const MAX_RECORDS_PER_BATCH = 100;
const MAX_TEXT_LENGTH = 1000;
const SYNC_STATUSES = [
  'local',
  'pending',
  'syncing',
  'synced',
  'rejected',
  'error',
];

export function isSyncRequest(value: unknown): value is SyncRequest {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['deviceId', 'sentAt', 'records']) ||
    !isNonEmptyString(value.deviceId, 128) ||
    !isIsoUtc(value.sentAt)
  )
    return false;
  if (
    !Array.isArray(value.records) ||
    value.records.length > MAX_RECORDS_PER_BATCH
  )
    return false;

  return value.records.every((record) => {
    if (
      !isRecord(record) ||
      !hasOnlyKeys(record, ['recordId', 'kind', 'operation', 'payload'])
    )
      return false;
    if (
      !isNonEmptyString(record.recordId, 128) ||
      record.operation !== 'upsert'
    )
      return false;
    if (record.kind === 'session') return isCashSession(record.payload);
    if (record.kind === 'movement') return isMovement(record.payload);
    return false;
  });
}

function isCashSession(value: unknown): value is CashSession {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'id',
      'userId',
      'registerId',
      'currency',
      'openedAt',
      'openingBalanceMinor',
      'status',
      'closedAt',
      'countedBalanceMinor',
      'expectedBalanceMinor',
      'varianceMinor',
      'varianceNote',
      'closedByUserId',
      'denominationBreakdown',
      'syncStatus',
    ])
  )
    return false;
  return (
    isNonEmptyString(value.id, 128) &&
    isNonEmptyString(value.userId, 128) &&
    isNonEmptyString(value.registerId, 128) &&
    typeof value.currency === 'string' &&
    /^[A-Z]{3}$/.test(value.currency) &&
    isIsoUtc(value.openedAt) &&
    isSafeInteger(value.openingBalanceMinor) &&
    (value.status === 'open' || value.status === 'closed') &&
    isNullableIsoUtc(value.closedAt) &&
    isNullableNonNegativeInteger(value.countedBalanceMinor) &&
    isNullableNonNegativeInteger(value.expectedBalanceMinor) &&
    isNullableSafeInteger(value.varianceMinor) &&
    isNullableString(value.varianceNote, MAX_TEXT_LENGTH) &&
    isNullableString(value.closedByUserId, 128) &&
    isNullableDenominationBreakdown(value.denominationBreakdown) &&
    typeof value.syncStatus === 'string' &&
    SYNC_STATUSES.includes(value.syncStatus)
  );
}

function isMovement(value: unknown): value is Movement {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'id',
      'sessionId',
      'userId',
      'type',
      'direction',
      'amountMinor',
      'currency',
      'description',
      'occurredAt',
      'createdAt',
      'reference',
      'counterparty',
      'counterpartyRegisterId',
      'reversalOf',
      'reversedBy',
      'reversalReason',
      'syncStatus',
    ])
  )
    return false;
  return (
    isNonEmptyString(value.id, 128) &&
    isNonEmptyString(value.sessionId, 128) &&
    isNonEmptyString(value.userId, 128) &&
    isNonEmptyString(value.type, 64) &&
    (value.direction === 'in' || value.direction === 'out') &&
    isSafeInteger(value.amountMinor) &&
    value.amountMinor > 0 &&
    typeof value.currency === 'string' &&
    /^[A-Z]{3}$/.test(value.currency) &&
    isNonEmptyString(value.description, 140) &&
    value.description.trim().length >= 3 &&
    isIsoUtc(value.occurredAt) &&
    isIsoUtc(value.createdAt) &&
    isNullableString(value.reference, 256) &&
    isNullableString(value.counterparty, 256) &&
    isNullableString(value.counterpartyRegisterId, 128) &&
    isNullableString(value.reversalOf, 128) &&
    isNullableString(value.reversedBy, 128) &&
    isNullableString(value.reversalReason, 256) &&
    typeof value.syncStatus === 'string' &&
    SYNC_STATUSES.includes(value.syncStatus)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: string[],
): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function isNullableString(
  value: unknown,
  maxLength: number,
): value is string | null {
  return (
    value === null || (typeof value === 'string' && value.length <= maxLength)
  );
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function isNullableNonNegativeInteger(value: unknown): value is number | null {
  return value === null || (isSafeInteger(value) && value >= 0);
}

function isNullableSafeInteger(value: unknown): value is number | null {
  return value === null || isSafeInteger(value);
}

function isIsoUtc(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
  ) {
    return false;
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return false;
  const fractional = value.match(/\.(\d{1,3})Z$/);
  const canonicalInput = fractional
    ? value.replace(/\.(\d{1,3})Z$/, `.${fractional[1].padEnd(3, '0')}Z`)
    : value.replace(/Z$/, '.000Z');
  return parsed.toISOString() === canonicalInput;
}

function isNullableIsoUtc(value: unknown): value is string | null {
  return value === null || isIsoUtc(value);
}

function isNullableDenominationBreakdown(
  value: unknown,
): value is Record<string, number> | null {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  return Object.values(value).every(
    (count) => isSafeInteger(count) && count >= 0,
  );
}
