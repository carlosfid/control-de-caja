import type { SyncStatus } from './sync-status';

export interface CashSession {
  id: string;
  userId: string;
  registerId: string;
  currency: string;
  openedAt: string;
  openingBalanceMinor: number;
  status: 'open' | 'closed';
  closedAt: string | null;
  countedBalanceMinor: number | null;
  expectedBalanceMinor: number | null;
  varianceMinor: number | null;
  varianceNote: string | null;
  closedByUserId: string | null;
  denominationBreakdown: Record<string, number> | null;
  syncStatus: SyncStatus;
}
