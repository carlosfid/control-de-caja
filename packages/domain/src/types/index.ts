export type UserRole = 'admin' | 'cashier' | 'auditor';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface CashSession {
  id: string;
  userId: string;
  openedAt: string;
  closedAt?: string;
  openingAmountCents: number;
}

export interface Movement {
  id: string;
  sessionId: string;
  type: string;
  direction: 'in' | 'out';
  amountCents: number;
  note?: string;
  createdAt: string;
}

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error' | 'rejected';
