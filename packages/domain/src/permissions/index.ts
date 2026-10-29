import type { UserRole } from '../types';

export const permissions: Record<UserRole, readonly string[]> = {
  admin: ['cash.open', 'cash.close', 'movement.create', 'movement.review', 'sync.manage'],
  cashier: ['cash.open', 'cash.close', 'movement.create'],
  auditor: ['movement.review'],
};

export function can(role: UserRole, action: string): boolean {
  return permissions[role].includes(action);
}
