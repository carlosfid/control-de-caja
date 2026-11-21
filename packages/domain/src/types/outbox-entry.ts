import type { SyncStatus } from './sync-status';

export interface OutboxEntry {
  id: string;
  sequence: number;
  entityType: 'session' | 'movement';
  entityId: string;
  operation: 'create' | 'close';
  status: SyncStatus;
  attempts: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  lastError: { code: string; detail: string } | null;
  serverResult: { result: string; reason: string } | null;
  createdAt: string;
  updatedAt: string;
}
