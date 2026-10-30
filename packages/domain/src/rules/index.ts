import type { CashSession, Movement } from '../types';

export function calculateExpectedBalance(session: CashSession, movements: Movement[]): number {
  return movements.reduce(
    (balance, movement) => balance + (movement.direction === 'in' ? movement.amountMinor : -movement.amountMinor),
    session.openingBalanceMinor,
  );
}
