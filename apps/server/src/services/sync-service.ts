import type {
  SyncRecord,
  SyncRequest,
  SyncResponse,
  SyncResult,
} from '../contracts/sync';
import type { ServerDatabase } from '../db/database';
import { isSyncRequest } from '../../../../packages/domain/src/sync-contract';
import { MOVEMENT_TYPE_DEFINITIONS } from '../../../../packages/domain/src/movement-types/catalog';

export interface DemoSyncConfig {
  amountLimitMinor: number;
  forcedRejectCount: number;
  latencyMs: number;
  failNextCount: number;
  loseResponseCount: number;
}

const DEFAULT_CONFIG: DemoSyncConfig = {
  amountLimitMinor: 10_000_000,
  forcedRejectCount: 0,
  latencyMs: 0,
  failNextCount: 0,
  loseResponseCount: 0,
};

interface StoredSyncResult {
  result: SyncResult['status'];
  reason: string | null;
  userId: string | null;
}

export class SyncService {
  private readonly config: DemoSyncConfig;
  private readonly defaults: DemoSyncConfig;

  constructor(
    private readonly database: ServerDatabase,
    initialConfig: Partial<DemoSyncConfig> = {},
  ) {
    const defaults = { ...DEFAULT_CONFIG, ...initialConfig };
    for (const [key, value] of Object.entries(defaults) as Array<
      [keyof DemoSyncConfig, number]
    >) {
      if (
        !Number.isSafeInteger(value) ||
        value < 0 ||
        value > this.maximumFor(key)
      ) {
        throw new RangeError(`Invalid demo configuration: ${key}`);
      }
    }
    this.defaults = defaults;
    this.config = this.loadConfig();
  }

  getConfig(): DemoSyncConfig {
    return { ...this.config };
  }

  setConfig(next: Partial<DemoSyncConfig>): void {
    for (const key of Object.keys(next) as Array<keyof DemoSyncConfig>) {
      const value = next[key];
      if (value === undefined) continue;
      if (
        !Number.isSafeInteger(value) ||
        value < 0 ||
        value > this.maximumFor(key)
      ) {
        throw new RangeError(`Invalid demo configuration: ${key}`);
      }
      this.config[key] = value;
    }
    this.persistConfig();
  }

  reset(): void {
    this.database.db.transaction(() => {
      this.database.db.exec(
        'DELETE FROM sync_attempts; DELETE FROM sync_log; DELETE FROM movements; DELETE FROM sessions; DELETE FROM config;',
      );
      Object.assign(this.config, this.defaults);
      this.persistConfig();
    })();
  }

  closeSession(sessionId: string, now = new Date().toISOString()): boolean {
    const result = this.database.db
      .prepare(
        "UPDATE sessions SET status = 'closed', closedAt = ?, syncStatus = 'synced' WHERE id = ?",
      )
      .run(now, sessionId);
    return result.changes > 0;
  }

  getState() {
    const count = (query: string) =>
      (this.database.db.prepare(query).get() as { count: number }).count;
    const total = count(
      'SELECT (SELECT COUNT(*) FROM sync_log) + (SELECT COUNT(*) FROM sync_attempts) AS count',
    );
    const accepted = count(
      "SELECT COUNT(*) AS count FROM sync_log WHERE result = 'accepted'",
    );
    const duplicates = count('SELECT COUNT(*) AS count FROM sync_attempts');
    const rejected = count(
      "SELECT COUNT(*) AS count FROM sync_log WHERE result = 'rejected'",
    );
    const latest = this.database.db
      .prepare(
        `
      SELECT recordId, kind, operation, result, reason, deviceId, userId, receivedAt
      FROM sync_log
      UNION ALL
      SELECT recordId, kind, operation, result, reason, deviceId, userId, receivedAt
      FROM sync_attempts
      ORDER BY receivedAt DESC
      LIMIT 50
    `,
      )
      .all();
    const transfers = this.database.db
      .prepare(
        "SELECT id, type, reference, amountMinor FROM movements WHERE type IN ('transfer_out', 'transfer_in')",
      )
      .all() as Array<{
      id: string;
      type: string;
      reference: string | null;
      amountMinor: number;
    }>;
    const unmatchedTransfers = transfers.filter(
      (transfer) =>
        !transfers.some(
          (counterpart) =>
            counterpart.id !== transfer.id &&
            counterpart.reference === transfer.reference &&
            counterpart.amountMinor === transfer.amountMinor &&
            counterpart.type !== transfer.type,
        ),
    );
    return {
      total,
      accepted,
      duplicates,
      rejected,
      latest,
      unmatchedTransfers,
      config: this.getConfig(),
    };
  }

  async waitForConfiguredLatency(): Promise<void> {
    if (this.config.latencyMs > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.latencyMs),
      );
    }
  }

  takeHttpFailure(): boolean {
    if (this.config.failNextCount === 0) return false;
    this.config.failNextCount -= 1;
    this.persistConfig();
    return true;
  }

  takeLostResponse(): boolean {
    if (this.config.loseResponseCount === 0) return false;
    this.config.loseResponseCount -= 1;
    this.persistConfig();
    return true;
  }

  process(
    request: SyncRequest,
    authenticatedUserId: string,
    now = new Date().toISOString(),
  ): SyncResponse {
    if (!isSyncRequest(request))
      throw new TypeError('Invalid synchronization request');

    const results: SyncResult[] = [];
    for (const record of request.records) {
      const { result, forcedRejection } = this.processRecord(
        record,
        request.deviceId,
        authenticatedUserId,
        now,
      );
      results.push(result);
      if (forcedRejection) {
        this.config.forcedRejectCount -= 1;
        this.persistConfig();
      }
    }
    return { results };
  }

  private processRecord(
    record: SyncRecord,
    deviceId: string,
    authenticatedUserId: string,
    now: string,
  ): { result: SyncResult; forcedRejection: boolean } {
    let forcedRejection = false;
    const processOne = this.database.db.transaction(() => {
      const previous = this.database.db
        .prepare(
          'SELECT result, reason, userId FROM sync_log WHERE recordId = ?',
        )
        .get(record.recordId) as StoredSyncResult | undefined;
      if (previous) {
        if (previous.userId !== authenticatedUserId) {
          return {
            result: {
              recordId: record.recordId,
              status: 'rejected' as const,
              reason: 'UNAUTHORIZED',
            },
            forcedRejection,
          };
        }
        this.database.db
          .prepare(
            `
          INSERT INTO sync_attempts (recordId, kind, operation, result, reason, deviceId, userId, receivedAt)
          VALUES (?, ?, ?, 'duplicate', ?, ?, ?, ?)
        `,
          )
          .run(
            record.recordId,
            record.kind,
            record.operation,
            previous.reason,
            deviceId,
            authenticatedUserId,
            now,
          );
        return {
          result: {
            recordId: record.recordId,
            status: 'duplicate' as const,
            reason: previous.reason ?? undefined,
            originalResult: previous.result as 'accepted' | 'rejected',
          },
          forcedRejection,
        };
      }

      const payload = record.payload as Record<string, unknown>;
      const userId = typeof payload.userId === 'string' ? payload.userId : null;
      let status: SyncResult['status'] = 'accepted';
      let reason: string | undefined;

      if (
        !userId ||
        userId !== authenticatedUserId ||
        !this.userExists(userId)
      ) {
        status = 'rejected';
        reason = 'UNAUTHORIZED';
      } else if (record.kind === 'session') {
        const outcome = this.processSession(payload, userId);
        status = outcome.status;
        reason = outcome.reason;
      } else {
        const outcome = this.processMovement(payload, userId, now);
        status = outcome.status;
        reason = outcome.reason;
        forcedRejection = outcome.forcedRejection;
      }

      this.database.db
        .prepare(
          `
        INSERT INTO sync_log (recordId, kind, operation, result, reason, deviceId, userId, receivedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        )
        .run(
          record.recordId,
          record.kind,
          record.operation,
          status,
          reason ?? null,
          deviceId,
          userId,
          now,
        );

      return {
        result: { recordId: record.recordId, status, reason },
        forcedRejection,
      };
    });

    return processOne();
  }

  private processSession(
    payload: Record<string, unknown>,
    userId: string,
  ): { status: SyncResult['status']; reason?: string } {
    const id = payload.id as string;
    const user = this.database.db
      .prepare('SELECT role, registerId FROM users WHERE id = ?')
      .get(userId) as { role: string; registerId: string | null } | undefined;
    if (!user || (user.role !== 'cashier' && user.role !== 'supervisor')) {
      return { status: 'rejected', reason: 'UNAUTHORIZED' };
    }
    if (user.registerId && payload.registerId !== user.registerId) {
      return { status: 'rejected', reason: 'INVALID_PAYLOAD' };
    }

    const existing = this.database.db
      .prepare(
        'SELECT userId, registerId, currency, status FROM sessions WHERE id = ?',
      )
      .get(id) as
      | { userId: string; registerId: string; currency: string; status: string }
      | undefined;
    if (
      existing &&
      (existing.userId !== userId ||
        existing.registerId !== payload.registerId ||
        existing.currency !== payload.currency)
    ) {
      return { status: 'rejected', reason: 'INVALID_PAYLOAD' };
    }
    if (existing?.status === 'closed' && payload.status === 'open') {
      return { status: 'rejected', reason: 'SESSION_CLOSED_SERVER' };
    }
    if (!this.isValidSessionState(payload))
      return { status: 'rejected', reason: 'INVALID_PAYLOAD' };

    this.database.db
      .prepare(
        `
      INSERT INTO sessions
      (id, userId, registerId, currency, openedAt, openingBalanceMinor, status, closedAt, countedBalanceMinor, expectedBalanceMinor, varianceMinor, varianceNote, closedByUserId, denominationBreakdown, syncStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
      ON CONFLICT(id) DO UPDATE SET
        openedAt = excluded.openedAt,
        openingBalanceMinor = excluded.openingBalanceMinor,
        status = excluded.status,
        closedAt = excluded.closedAt,
        countedBalanceMinor = excluded.countedBalanceMinor,
        expectedBalanceMinor = excluded.expectedBalanceMinor,
        varianceMinor = excluded.varianceMinor,
        varianceNote = excluded.varianceNote,
        closedByUserId = excluded.closedByUserId,
        denominationBreakdown = excluded.denominationBreakdown,
        syncStatus = 'synced'
    `,
      )
      .run(
        id,
        userId,
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
        payload.denominationBreakdown
          ? JSON.stringify(payload.denominationBreakdown)
          : null,
      );
    return { status: 'accepted' };
  }

  private processMovement(
    payload: Record<string, unknown>,
    userId: string,
    now: string,
  ): {
    status: SyncResult['status'];
    reason?: string;
    forcedRejection: boolean;
  } {
    const id = payload.id as string;
    const sessionId = payload.sessionId as string;
    const session = this.database.db
      .prepare(
        'SELECT id, userId, currency, status, openedAt FROM sessions WHERE id = ?',
      )
      .get(sessionId) as
      | {
          id: string;
          userId: string;
          currency: string;
          status: string;
          openedAt: string;
        }
      | undefined;
    const reject = (reason: string) => ({
      status: 'rejected' as const,
      reason,
      forcedRejection: false,
    });

    if (!session) return reject('SESSION_NOT_FOUND');
    if (session.status === 'closed') return reject('SESSION_CLOSED_SERVER');
    if (session.userId !== userId) return reject('UNAUTHORIZED');
    if (session.currency !== payload.currency) return reject('INVALID_PAYLOAD');
    if (
      this.database.db.prepare('SELECT id FROM movements WHERE id = ?').get(id)
    )
      return reject('INVALID_PAYLOAD');

    const type = payload.type as string;
    const typeDefinition = MOVEMENT_TYPE_DEFINITIONS.find(
      (definition) => definition.id === type,
    );
    const movementUser = this.database.db
      .prepare('SELECT role FROM users WHERE id = ?')
      .get(userId) as { role: string } | undefined;
    if (
      !typeDefinition ||
      (type !== 'reversal' && payload.direction !== typeDefinition.direction)
    ) {
      return reject('INVALID_TYPE');
    }
    if (
      !movementUser ||
      !typeDefinition.allowedRoles.some((role) => role === movementUser.role)
    ) {
      return reject('UNAUTHORIZED');
    }
    if (
      typeDefinition.requiredFields.some((field) => {
        const value = payload[field];
        if (field === 'amountMinor')
          return typeof value !== 'number' || value <= 0;
        if (field === 'description')
          return !hasText(value) || value.trim().length < 3;
        return !hasText(value);
      })
    ) {
      return reject('INVALID_PAYLOAD');
    }
    if (
      Date.parse(payload.occurredAt as string) < Date.parse(session.openedAt) ||
      Date.parse(payload.occurredAt as string) > Date.parse(now) + 5 * 60 * 1000
    ) {
      return reject('INVALID_PAYLOAD');
    }
    if ((payload.amountMinor as number) > this.config.amountLimitMinor)
      return reject('AMOUNT_OVER_LIMIT');

    let reversalTarget:
      | {
          id: string;
          sessionId: string;
          type: string;
          reversedBy: string | null;
          direction: string;
          amountMinor: number;
        }
      | undefined;
    if (type === 'reversal') {
      if (!hasText(payload.reversalOf) || !hasText(payload.reversalReason))
        return reject('INVALID_PAYLOAD');
      reversalTarget = this.database.db
        .prepare(
          'SELECT id, sessionId, type, reversedBy, direction, amountMinor FROM movements WHERE id = ?',
        )
        .get(payload.reversalOf) as typeof reversalTarget;
      if (!reversalTarget) return reject('REVERSAL_TARGET_UNKNOWN');
      if (
        reversalTarget.sessionId !== sessionId ||
        reversalTarget.type === 'reversal' ||
        reversalTarget.reversedBy ||
        reversalTarget.amountMinor !== payload.amountMinor ||
        reversalTarget.direction === payload.direction
      )
        return reject('INVALID_PAYLOAD');
    } else if (payload.reversalOf !== null) {
      return reject('INVALID_PAYLOAD');
    }

    if (this.config.forcedRejectCount > 0) {
      return {
        status: 'rejected',
        reason: 'FORCED_REJECTION',
        forcedRejection: true,
      };
    }

    this.database.db
      .prepare(
        `
      INSERT INTO movements
      (id, sessionId, userId, type, direction, amountMinor, currency, description, occurredAt, createdAt, reference, counterparty, counterpartyRegisterId, reversalOf, reversedBy, reversalReason, syncStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'synced')
    `,
      )
      .run(
        id,
        sessionId,
        userId,
        type,
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
        payload.reversalReason,
      );
    if (reversalTarget) {
      this.database.db
        .prepare('UPDATE movements SET reversedBy = ? WHERE id = ?')
        .run(id, reversalTarget.id);
    }
    return { status: 'accepted', forcedRejection: false };
  }

  private isValidSessionState(payload: Record<string, unknown>): boolean {
    if ((payload.openingBalanceMinor as number) < 0) return false;
    if (payload.status === 'open') {
      return (
        payload.closedAt === null &&
        payload.countedBalanceMinor === null &&
        payload.expectedBalanceMinor === null &&
        payload.varianceMinor === null &&
        payload.varianceNote === null &&
        payload.closedByUserId === null &&
        payload.denominationBreakdown === null
      );
    }
    if (
      payload.status !== 'closed' ||
      !payload.closedAt ||
      payload.countedBalanceMinor === null ||
      payload.expectedBalanceMinor === null ||
      payload.varianceMinor === null ||
      !payload.closedByUserId ||
      !this.userExists(payload.closedByUserId as string)
    )
      return false;
    if (
      Date.parse(payload.closedAt as string) <
      Date.parse(payload.openedAt as string)
    )
      return false;
    const variance = payload.varianceMinor as number;
    if (
      variance !== 0 &&
      (typeof payload.varianceNote !== 'string' ||
        payload.varianceNote.trim().length < 3)
    )
      return false;
    return (
      variance ===
      (payload.countedBalanceMinor as number) -
        (payload.expectedBalanceMinor as number)
    );
  }

  private userExists(userId: string): boolean {
    return Boolean(
      this.database.db.prepare('SELECT id FROM users WHERE id = ?').get(userId),
    );
  }

  private loadConfig(): DemoSyncConfig {
    const loaded = { ...this.defaults };
    const rows = this.database.db
      .prepare('SELECT key, value FROM config')
      .all() as Array<{ key: string; value: string }>;
    for (const row of rows) {
      if (!(row.key in loaded)) continue;
      const key = row.key as keyof DemoSyncConfig;
      const value = Number(row.value);
      if (
        !Number.isSafeInteger(value) ||
        value < 0 ||
        value > this.maximumFor(key)
      ) {
        throw new Error(`Invalid persisted demo configuration: ${key}`);
      }
      loaded[key] = value;
    }
    return loaded;
  }

  private persistConfig(): void {
    const write = this.database.db.prepare(
      'INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    );
    for (const [key, value] of Object.entries(this.config))
      write.run(key, String(value));
  }

  private maximumFor(key: keyof DemoSyncConfig): number {
    if (key === 'amountLimitMinor') return Number.MAX_SAFE_INTEGER;
    if (key === 'latencyMs') return 60_000;
    return 1_000_000;
  }
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
