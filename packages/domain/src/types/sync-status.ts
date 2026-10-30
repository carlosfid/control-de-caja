export const SYNC_STATUSES = ['local', 'pending', 'syncing', 'synced', 'rejected', 'error'] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];
