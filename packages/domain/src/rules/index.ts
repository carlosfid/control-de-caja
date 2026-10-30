import type { CashSession, Movement } from '../types';
export * from './auth-rules';

export function calculateExpectedBalance(session: CashSession, movements: Movement[]): number {
  return movements.reduce(
    (balance, movement) => balance + (movement.direction === 'in' ? movement.amountMinor : -movement.amountMinor),
    session.openingBalanceMinor,
  );
}
