import type { CashSession, Movement } from '../types';
export * from './auth-rules';
export * from './session-rules';
export * from './movement-rules';
export * from './balance-rules';
export * from './closing-rules';
export * from './denomination-rules';
export * from './session-report';

export function calculateExpectedBalance(session: CashSession, movements: Movement[]): number {
  return movements.reduce(
    (balance, movement) => balance + (movement.direction === 'in' ? movement.amountMinor : -movement.amountMinor),
    session.openingBalanceMinor,
  );
}
