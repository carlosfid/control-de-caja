import type { Role } from '../types';

export const permissions: Record<Role, readonly string[]> = {
  cashier: ['session.open', 'session.close', 'session.viewOwn', 'movement.create', 'movement.reverse', 'sync.viewOwn', 'sync.retry'],
  supervisor: ['session.open', 'session.close', 'session.viewOwn', 'session.viewAll', 'movement.create', 'movement.reverse', 'sync.viewOwn', 'sync.viewAll', 'sync.retry', 'audit.view', 'export.run', 'settings.manage'],
  accountant: ['session.viewAll', 'sync.viewAll', 'audit.view', 'export.run'],
};

export function can(role: Role, action: string): boolean {
  return permissions[role].includes(action);
}
