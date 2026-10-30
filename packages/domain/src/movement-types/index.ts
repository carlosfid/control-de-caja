import type { MovementType, MovementTypeDefinition } from '../types';

export const MOVEMENT_TYPE_DEFINITIONS: MovementTypeDefinition[] = [
  { id: 'sale', direction: 'in', requiredFields: ['amountMinor', 'description'], optionalFields: ['reference'], allowedRoles: ['cashier', 'supervisor'] },
  { id: 'collection', direction: 'in', requiredFields: ['amountMinor', 'description'], optionalFields: ['counterparty'], allowedRoles: ['cashier', 'supervisor'] },
  { id: 'other_income', direction: 'in', requiredFields: ['amountMinor', 'description'], optionalFields: [], allowedRoles: ['cashier', 'supervisor'] },
  { id: 'refund', direction: 'out', requiredFields: ['amountMinor', 'description'], optionalFields: [], allowedRoles: ['cashier', 'supervisor'] },
  { id: 'operating_expense', direction: 'out', requiredFields: ['amountMinor', 'description'], optionalFields: [], allowedRoles: ['cashier', 'supervisor'] },
  { id: 'salary_payment', direction: 'out', requiredFields: ['amountMinor', 'description'], optionalFields: [], allowedRoles: ['supervisor'] },
  { id: 'other_expense', direction: 'out', requiredFields: ['amountMinor', 'description'], optionalFields: [], allowedRoles: ['cashier', 'supervisor'] },
];

export function getMovementTypeDef(type: MovementType): MovementTypeDefinition | undefined {
  return MOVEMENT_TYPE_DEFINITIONS.find((definition) => definition.id === type);
}
