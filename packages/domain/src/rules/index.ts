import type { CashSession, Movement } from '../types';
export * from './auth-rules';
export * from './session-rules';
export * from './movement-rules';
export * from './balance-rules';

export function calculateExpectedBalance(session: CashSession, movements: Movement[]): number {
  return movements.reduce(
    (balance, movement) => balance + (movement.direction === 'in' ? movement.amountMinor : -movement.amountMinor),
    session.openingBalanceMinor,
  );
}
