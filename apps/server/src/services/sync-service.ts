import type { SyncRequest, SyncResponse, SyncResult } from '../contracts/sync';
import type { ServerDatabase } from '../db/database';

export interface DemoSyncConfig {
  amountLimitMinor: number;
  forcedRejectCount: number;
}

export class SyncService {
  constructor(private readonly database: ServerDatabase, private readonly config: DemoSyncConfig = { amountLimitMinor: 10_000_000, forcedRejectCount: 0 }) {}

  getConfig(): DemoSyncConfig {
    return { ...this.config };
  }

  setConfig(next: Partial<DemoSyncConfig>): void {
    if (typeof next.amountLimitMinor === 'number') this.config.amountLimitMinor = next.amountLimitMinor;
    if (typeof next.forcedRejectCount === 'number') this.config.forcedRejectCount = next.forcedRejectCount;
  }

  reset(): void {
    this.database.db.exec('DELETE FROM sync_log; DELETE FROM movements; DELETE FROM sessions;');
  }

  closeSession(sessionId: string, now = new Date().toISOString()): boolean {
    const result = this.database.db.prepare("UPDATE sessions SET status = 'closed', closedAt = ?, syncStatus = 'synced' WHERE id = ?").run(now, sessionId);
    return result.changes > 0;
  }

  getState() {
    const total = this.database.db.prepare('SELECT COUNT(*) AS count FROM sync_log').get() as { count: number };
    const accepted = this.database.db.prepare("SELECT COUNT(*) AS count FROM sync_log WHERE result = 'accepted'").get() as { count: number };
    const duplicates = this.database.db.prepare("SELECT COUNT(*) AS count FROM sync_log WHERE result = 'duplicate'").get() as { count: number };
    const rejected = this.database.db.prepare("SELECT COUNT(*) AS count FROM sync_log WHERE result = 'rejected'").get() as { count: number };
    const latest = this.database.db.prepare('SELECT * FROM sync_log ORDER BY receivedAt DESC LIMIT 50').all();
    const transfers = this.database.db.prepare("SELECT * FROM movements WHERE type IN ('transfer_out', 'transfer_in')").all() as Array<{ id: string; type: string; reference: string | null; amountMinor: number }>;
    const unmatchedTransfers = transfers.filter((transfer) => !transfers.some((counterpart) => counterpart.id !== transfer.id && counterpart.reference === transfer.reference && counterpart.type !== transfer.type));
    return { total: total.count, accepted: accepted.count, duplicates: duplicates.count, rejected: rejected.count, latest, unmatchedTransfers, config: this.getConfig() };
  }

  process(request: SyncRequest, now = new Date().toISOString()): SyncResponse {
    const results: SyncResult[] = [];
    const insertLog = this.database.db.prepare(`
      INSERT INTO sync_log (recordId, kind, operation, result, reason, deviceId, userId, receivedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const existing = this.database.db.prepare('SELECT * FROM sync_log WHERE recordId = ?');

    const transaction = this.database.db.transaction(() => {
      for (const record of request.records) {
        const previous = existing.get(record.recordId) as { result: string; reason: string | null } | undefined;
        if (previous) {
          results.push({ recordId: record.recordId, status: 'duplicate', reason: previous.reason ?? undefined });
          continue;
        }

        const payload = record.payload as Record<string, unknown>;
        const userId = typeof payload.userId === 'string' ? payload.userId : null;
        let status: SyncResult['status'] = 'accepted';
        let reason: string | undefined;

        if (record.kind === 'session') {
          const id = typeof payload.id === 'string' ? payload.id : null;
          if (!id) {
            status = 'rejected'; reason = 'INVALID_PAYLOAD';
          } else {
            this.database.db.prepare(`
              INSERT OR REPLACE INTO sessions
              (id, userId, registerId, currency, openedAt, openingBalanceMinor, status, closedAt, countedBalanceMinor, expectedBalanceMinor, varianceMinor, varianceNote, closedByUserId, denominationBreakdown, syncStatus)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
            `).run(
              id,
              payload.userId,
              payload.registerId,
              payload.currency,
              payload.openedAt,
              payload.openingBalanceMinor,
              payload.status,
              payload.closedAt,
              payload.countedBalanceMinor,
              payload.expectedBalanceMinor,
              payload.varianceMinor,
              payload.varianceNote,
              payload.closedByUserId,
              payload.denominationBreakdown ? JSON.stringify(payload.denominationBreakdown) : null,
            );
          }
        } else if (record.kind === 'movement') {
          const id = typeof payload.id === 'string' ? payload.id : null;
          const amountMinor = typeof payload.amountMinor === 'number' ? payload.amountMinor : 0;
          const session = id ? this.database.db.prepare('SELECT id, status FROM sessions WHERE id = ?').get(payload.sessionId) as { id: string; status: string } | undefined : undefined;

          if (!id || !payload.sessionId) {
            status = 'rejected'; reason = 'INVALID_PAYLOAD';
          } else if (!session) {
            status = 'rejected'; reason = 'SESSION_NOT_FOUND';
          } else if (session.status === 'closed') {
            status = 'rejected'; reason = 'SESSION_CLOSED_SERVER';
          } else if (typeof payload.reversalOf === 'string' && !this.database.db.prepare('SELECT id FROM movements WHERE id = ?').get(payload.reversalOf)) {
            status = 'rejected'; reason = 'REVERSAL_TARGET_UNKNOWN';
          } else if (!['sale', 'collection', 'other_income', 'refund', 'operating_expense', 'salary_payment', 'other_expense', 'payment', 'transfer_out', 'transfer_in', 'reversal'].includes(String(payload.type))) {
            status = 'rejected'; reason = 'INVALID_TYPE';
          } else if (amountMinor > this.config.amountLimitMinor) {
            status = 'rejected'; reason = 'AMOUNT_OVER_LIMIT';
          } else if (this.config.forcedRejectCount > 0) {
            this.config.forcedRejectCount -= 1;
            status = 'rejected'; reason = 'FORCED_REJECTION';
          } else {
            this.database.db.prepare(`
              INSERT OR REPLACE INTO movements
              (id, sessionId, userId, type, direction, amountMinor, currency, description, occurredAt, createdAt, reference, counterparty, counterpartyRegisterId, reversalOf, reversedBy, reversalReason, syncStatus)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
            `).run(
              id,
              payload.sessionId,
              payload.userId,
              payload.type,
              payload.direction,
              payload.amountMinor,
              payload.currency,
              payload.description,
              payload.occurredAt,
              payload.createdAt,
              payload.reference,
              payload.counterparty,
              payload.counterpartyRegisterId,
              payload.reversalOf,
              payload.reversedBy,
              payload.reversalReason,
            );
          }
        } else {
          status = 'rejected'; reason = 'INVALID_TYPE';
        }

        insertLog.run(record.recordId, record.kind, record.operation, status, reason ?? null, request.deviceId, userId, now);
        results.push({ recordId: record.recordId, status, reason });
      }
    });

    transaction();
    return { results };
  }
}
