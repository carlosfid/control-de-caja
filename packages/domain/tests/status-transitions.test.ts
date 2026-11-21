import { describe, expect, it } from 'vitest';
import { canTransition, SYNC_STATUSES, type SyncStatus } from '../src';

const allowed: Record<SyncStatus, SyncStatus[]> = {
  local: ['pending'],
  pending: ['syncing', 'pending'],
  syncing: ['synced', 'rejected', 'error', 'pending'],
  synced: [],
  rejected: [],
  error: ['pending'],
};

describe('sync status transitions', () => {
  for (const from of SYNC_STATUSES) {
    for (const to of SYNC_STATUSES) {
      it(`${from} -> ${to}`, () => {
        expect(canTransition(from, to)).toBe(allowed[from].includes(to));
      });
    }
  }
});
