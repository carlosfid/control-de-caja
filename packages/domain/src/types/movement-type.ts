import type { Role } from './role';

export type MovementType = 'sale' | 'collection' | 'other_income' | 'refund' | 'operating_expense' | 'salary_payment' | 'other_expense' | 'payment' | 'transfer_out' | 'transfer_in' | 'reversal';
export interface MovementTypeDefinition {
  id: MovementType;
  direction: 'in' | 'out';
  requiredFields: string[];
  optionalFields: string[];
  allowedRoles: Role[];
}
