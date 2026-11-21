import type { CashSession, Movement, MovementType, SyncStatus } from '../types';

export interface SessionSummary {
  incomeMinor: number;
  expenseMinor: number;
  expectedBalanceMinor: number;
  byType: Record<string, number>;
  bySyncStatus: Record<string, number>;
}

export function summarizeSession(session: CashSession, movements: Movement[]): SessionSummary {
  const byType: Record<string, number> = {};
  const bySyncStatus: Record<string, number> = {};
  let incomeMinor = 0;
  let expenseMinor = 0;

  for (const movement of movements) {
    const type = movement.type as MovementType;
    byType[type] = (byType[type] ?? 0) + 1;
    bySyncStatus[movement.syncStatus] = (bySyncStatus[movement.syncStatus] ?? 0) + 1;
    if (movement.direction === 'in') incomeMinor += movement.amountMinor;
    else expenseMinor += movement.amountMinor;
  }

  return {
    incomeMinor,
    expenseMinor,
    expectedBalanceMinor: session.openingBalanceMinor + incomeMinor - expenseMinor,
    byType,
    bySyncStatus,
  };
}
