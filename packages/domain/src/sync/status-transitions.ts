import type { SyncStatus } from '../types';

const allowedTransitions: Record<SyncStatus, readonly SyncStatus[]> = {
  local: ['pending'],
  pending: ['syncing', 'pending'],
  syncing: ['synced', 'rejected', 'error', 'pending'],
  synced: [],
  rejected: [],
  error: ['pending'],
};

export function canTransition(from: SyncStatus, to: SyncStatus): boolean {
  return allowedTransitions[from].includes(to);
}
