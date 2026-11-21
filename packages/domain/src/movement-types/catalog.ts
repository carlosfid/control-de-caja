import type { MovementType, MovementTypeDefinition } from '../types';

export const MOVEMENT_TYPE_DEFINITIONS: readonly MovementTypeDefinition[] = [
  { id: 'sale', direction: 'in', requiredFields: ['amountMinor', 'description'], optionalFields: ['occurredAt', 'reference'], allowedRoles: ['cashier', 'supervisor'] },
  { id: 'collection', direction: 'in', requiredFields: ['amountMinor', 'description'], optionalFields: ['occurredAt', 'counterparty'], allowedRoles: ['cashier', 'supervisor'] },
  { id: 'other_income', direction: 'in', requiredFields: ['amountMinor', 'description'], optionalFields: ['occurredAt'], allowedRoles: ['cashier', 'supervisor'] },
  { id: 'refund', direction: 'out', requiredFields: ['amountMinor', 'description'], optionalFields: ['occurredAt'], allowedRoles: ['cashier', 'supervisor'] },
  { id: 'operating_expense', direction: 'out', requiredFields: ['amountMinor', 'description'], optionalFields: ['occurredAt'], allowedRoles: ['cashier', 'supervisor'] },
  { id: 'salary_payment', direction: 'out', requiredFields: ['amountMinor', 'description'], optionalFields: ['occurredAt'], allowedRoles: ['supervisor'] },
  { id: 'other_expense', direction: 'out', requiredFields: ['amountMinor', 'description'], optionalFields: ['occurredAt'], allowedRoles: ['cashier', 'supervisor'] },
  { id: 'payment', direction: 'out', requiredFields: ['amountMinor', 'description', 'reference', 'counterparty'], optionalFields: ['occurredAt'], allowedRoles: ['cashier', 'supervisor'] },
  { id: 'transfer_out', direction: 'out', requiredFields: ['amountMinor', 'description', 'reference', 'counterpartyRegisterId'], optionalFields: ['occurredAt', 'counterparty'], allowedRoles: ['cashier', 'supervisor'] },
  { id: 'transfer_in', direction: 'in', requiredFields: ['amountMinor', 'description', 'reference', 'counterpartyRegisterId'], optionalFields: ['occurredAt', 'counterparty'], allowedRoles: ['cashier', 'supervisor'] },
  { id: 'reversal', direction: 'out', requiredFields: ['amountMinor', 'description', 'reversalOf'], optionalFields: ['occurredAt', 'reversalReason'], allowedRoles: ['cashier', 'supervisor'] },
];

export const MOVEMENT_TYPES = MOVEMENT_TYPE_DEFINITIONS.map((definition) => definition.id);

export function getMovementTypeDef(type: MovementType): MovementTypeDefinition | undefined {
  return MOVEMENT_TYPE_DEFINITIONS.find((definition) => definition.id === type);
}
