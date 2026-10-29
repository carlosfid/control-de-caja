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
}

export interface SyncResponse {
  results: SyncResult[];
}
