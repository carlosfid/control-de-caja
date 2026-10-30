import type { Role } from './role';

export const MOVEMENT_TYPES = ['sale', 'collection', 'other_income', 'refund', 'operating_expense', 'salary_payment', 'other_expense', 'payment', 'transfer_out', 'transfer_in', 'reversal'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];
export interface MovementTypeDefinition {
  id: MovementType;
  direction: 'in' | 'out';
  requiredFields: string[];
  optionalFields: string[];
  allowedRoles: Role[];
}
