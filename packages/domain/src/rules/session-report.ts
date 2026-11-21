import type { CashSession, Movement } from '../types';
import { summarizeSession } from './balance-rules';

export interface SessionReport {
  session: CashSession;
  movementCount: number;
  incomeMinor: number;
  expenseMinor: number;
  openingBalanceMinor: number;
  expectedBalanceMinor: number;
  countedBalanceMinor: number | null;
  varianceMinor: number | null;
  varianceNote: string | null;
  responsibleUserId: string | null;
  byType: Record<string, number>;
}

export function buildSessionReport(session: CashSession, movements: Movement[]): SessionReport {
  const summary = summarizeSession(session, movements);
  return {
    session,
    movementCount: movements.length,
    incomeMinor: summary.incomeMinor,
    expenseMinor: summary.expenseMinor,
    openingBalanceMinor: session.openingBalanceMinor,
    expectedBalanceMinor: summary.expectedBalanceMinor,
    countedBalanceMinor: session.countedBalanceMinor,
    varianceMinor: session.varianceMinor,
    varianceNote: session.varianceNote,
    responsibleUserId: session.closedByUserId,
    byType: summary.byType,
  };
}
