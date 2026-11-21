export const ROLES = ['cashier', 'supervisor', 'accountant'] as const;
export type Role = (typeof ROLES)[number];
