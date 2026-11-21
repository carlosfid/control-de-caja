export interface AuditEntry {
  id: string;
  at: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
}
