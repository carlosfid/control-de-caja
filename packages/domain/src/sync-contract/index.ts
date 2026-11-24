export interface SyncRecord {
  recordId: string;
  kind: 'session' | 'movement';
  operation: 'upsert';
  payload: unknown;
}

export interface SyncRequest {
  deviceId: string;
  sentAt: string;
  records: SyncRecord[];
}

export interface SyncResult {
  recordId: string;
  status: 'accepted' | 'duplicate' | 'rejected' | 'error';
  reason?: string;
  originalResult?: 'accepted' | 'rejected';
}

export interface SyncResponse {
  results: SyncResult[];
}

export const SYNC_REASON_CODES = [
  'AMOUNT_OVER_LIMIT',
  'SESSION_NOT_FOUND',
  'SESSION_CLOSED_SERVER',
  'INVALID_TYPE',
  'INVALID_PAYLOAD',
  'UNAUTHORIZED',
  'FORCED_REJECTION',
  'REVERSAL_TARGET_UNKNOWN',
] as const;

export type SyncReasonCode = (typeof SYNC_REASON_CODES)[number];
export { isSyncRequest } from './validation';
