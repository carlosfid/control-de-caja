import type { CashSession, Movement } from '../types';

export function validateMovement(movement: Movement): string[] {
  const errors: string[] = [];
  if (!movement.id) errors.push('El movimiento necesita un identificador.');
  if (!movement.sessionId) errors.push('El movimiento necesita una sesión.');
  if (!Number.isSafeInteger(movement.amountCents) || movement.amountCents <= 0) {
    errors.push('El importe debe ser un entero positivo de centavos.');
  }
  return errors;
}

export function calculateExpectedBalance(session: CashSession, movements: Movement[]): number {
  return movements.reduce(
    (balance, movement) => balance + (movement.direction === 'in' ? movement.amountCents : -movement.amountCents),
    session.openingAmountCents,
  );
}
