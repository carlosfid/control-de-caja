import type { SyncStatus } from './sync-status';

export interface Movement {
  id: string;
  sessionId: string;
  userId: string;
  type: string;
  direction: 'in' | 'out';
  amountMinor: number;
  currency: string;
  description: string;
  occurredAt: string;
  createdAt: string;
  reference: string | null;
  counterparty: string | null;
  counterpartyRegisterId: string | null;
  reversalOf: string | null;
  reversedBy: string | null;
  reversalReason: string | null;
  syncStatus: SyncStatus;
}
