export const ACTIONS = [
  'session.open', 'session.close', 'session.viewOwn', 'session.viewAll',
  'movement.create', 'movement.reverse', 'sync.viewOwn', 'sync.viewAll', 'sync.retry',
  'audit.view', 'export.run', 'settings.manage',
] as const;
export type Action = (typeof ACTIONS)[number];
