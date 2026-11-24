import type { OutboxEntry, SyncRequest, SyncResponse } from '@caja/domain';
import type { CajaDatabase } from '../data/db';
import { writeAudit } from '../data/audit-log';
import { nextAttemptAt } from './backoff';
import type { SyncEngine } from './sync-state';

export type ApiResult =
  | { ok: true; response: SyncResponse }
  | {
      ok: false;
      kind: 'network' | 'http' | 'contract';
      status?: number;
      detail: string;
    };

export interface ApiClient {
  sendBatch(request: SyncRequest): Promise<ApiResult>;
  renewToken?(): Promise<boolean>;
}

export function serializeOutboxRecord(
  db: CajaDatabase,
  entry: OutboxEntry,
): Promise<SyncRequest['records'][number] | null> {
  if (entry.entityType === 'session') {
    return db.sessions.get(entry.entityId).then((session) =>
      session
        ? {
            recordId: entry.id,
            kind: 'session',
            operation: 'upsert',
            payload: session,
          }
        : null,
    );
  }
  return db.movements.get(entry.entityId).then((movement) =>
    movement
      ? {
          recordId: entry.id,
          kind: 'movement',
          operation: 'upsert',
          payload: movement,
        }
      : null,
  );
}

export class RealSyncEngine implements SyncEngine {
  private running = false;

  constructor(
    private readonly db: CajaDatabase,
    private readonly apiClient: ApiClient,
    private readonly deviceId: string,
  ) {}

  async sync(now = new Date().toISOString()): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.recoverInterruptedEntries(now);

      const dueEntries = await dbOutboxDue(this.db, now);
      if (dueEntries.length === 0) return;

      const batches = chunk(dueEntries, 20);
      for (const batch of batches) {
        await this.db.transaction(
          'rw',
          this.db.outbox,
          this.db.sessions,
          this.db.movements,
          this.db.audit,
          async () => {
            for (const entry of batch) {
              await this.db.outbox.put({
                ...entry,
                status: 'syncing',
                updatedAt: now,
              });
            }
          },
        );

        const records: SyncRequest['records'] = [];
        const missingEntries: OutboxEntry[] = [];
        for (const entry of batch) {
          const record = await serializeOutboxRecord(this.db, entry);
          if (record) records.push(record);
          else missingEntries.push(entry);
        }

        if (missingEntries.length > 0) {
          await this.db.transaction('rw', this.db.outbox, async () => {
            for (const entry of missingEntries) {
              await this.db.outbox.put({
                ...entry,
                status: 'pending',
                updatedAt: now,
              });
            }
          });
        }

        if (records.length === 0) {
          await this.db.transaction('rw', this.db.outbox, async () => {
            for (const entry of batch) {
              await this.db.outbox.put({
                ...entry,
                status: 'pending',
                updatedAt: now,
              });
            }
          });
          continue;
        }
        let apiResult = await this.apiClient.sendBatch({
          deviceId: this.deviceId,
          sentAt: now,
          records,
        });

        if (
          !apiResult.ok &&
          apiResult.status === 401 &&
          this.apiClient.renewToken
        ) {
          const renewed = await this.apiClient.renewToken();
          if (renewed) {
            apiResult = await this.apiClient.sendBatch({
              deviceId: this.deviceId,
              sentAt: now,
              records,
            });
          }
        }

        if (!apiResult.ok) {
          await this.applyFailure(batch, apiResult.kind, apiResult.detail, now);
          if (
            apiResult.kind === 'network' ||
            apiResult.kind === 'http' ||
            apiResult.kind === 'contract'
          )
            return;
          continue;
        }

        await this.applyResponse(batch, apiResult.response, now);
      }
    } finally {
      this.running = false;
    }
  }

  private async recoverInterruptedEntries(now: string): Promise<void> {
    const entries = await this.db.outbox
      .where('status')
      .equals('syncing')
      .toArray();
    await this.db.transaction('rw', this.db.outbox, async () => {
      for (const entry of entries) {
        await this.db.outbox.put({
          ...entry,
          status: 'pending',
          updatedAt: now,
        });
      }
    });
  }

  private async applyResponse(
    batch: OutboxEntry[],
    response: SyncResponse,
    now: string,
  ): Promise<void> {
    const byRecordId = new Map(
      response.results.map((result) => [result.recordId, result]),
    );
    await this.db.transaction(
      'rw',
      this.db.outbox,
      this.db.sessions,
      this.db.movements,
      this.db.audit,
      async () => {
        for (const entry of batch) {
          const result = byRecordId.get(entry.id);
          if (!result) continue;

          const originalResult =
            result.status === 'duplicate'
              ? result.originalResult
              : result.status;
          if (
            originalResult === 'accepted' ||
            (result.status === 'duplicate' && !originalResult)
          ) {
            await this.db.outbox.put({
              ...entry,
              status: 'synced',
              updatedAt: now,
              serverResult: {
                result: originalResult ?? 'duplicate',
                reason: result.reason ?? '',
              },
            });
            await this.updateEntityStatus(
              entry.entityType,
              entry.entityId,
              'synced',
            );
            await writeAudit(this.db, {
              at: now,
              userId: await this.getEntityUserId(entry),
              action: 'sync_accepted',
              entityType: entry.entityType,
              entityId: entry.entityId,
              details: {
                recordId: entry.id,
                status: result.status,
                originalResult,
              },
            });
          } else if (originalResult === 'rejected') {
            await this.db.outbox.put({
              ...entry,
              status: 'rejected',
              updatedAt: now,
              serverResult: { result: 'rejected', reason: result.reason ?? '' },
            });
            await this.updateEntityStatus(
              entry.entityType,
              entry.entityId,
              'rejected',
            );
            await writeAudit(this.db, {
              at: now,
              userId: await this.getEntityUserId(entry),
              action: 'sync_rejected',
              entityType: entry.entityType,
              entityId: entry.entityId,
              details: {
                recordId: entry.id,
                reason: result.reason ?? '',
                duplicate: result.status === 'duplicate',
              },
            });
          } else {
            await this.markError(
              entry,
              'SYNC_REMOTE_ERROR',
              result.reason ?? 'Servidor respondió error',
              now,
            );
          }
        }
      },
    );
  }

  private async applyFailure(
    batch: OutboxEntry[],
    kind: string,
    detail: string,
    now: string,
  ): Promise<void> {
    await this.db.transaction(
      'rw',
      this.db.outbox,
      this.db.sessions,
      this.db.movements,
      this.db.audit,
      async () => {
        for (const entry of batch)
          await this.markError(entry, kind, detail, now);
      },
    );
  }

  private async markError(
    entry: OutboxEntry,
    code: string,
    detail: string,
    now: string,
  ): Promise<void> {
    const attempts = entry.attempts + 1;
    const next = attempts >= 5 ? null : nextAttemptAt(attempts, now);
    await this.db.outbox.put({
      ...entry,
      status: 'error',
      attempts,
      lastAttemptAt: now,
      nextAttemptAt: next,
      lastError: { code, detail },
      updatedAt: now,
    });
    await this.updateEntityStatus(entry.entityType, entry.entityId, 'error');
    await writeAudit(this.db, {
      at: now,
      userId: await this.getEntityUserId(entry),
      action: 'sync_failed',
      entityType: entry.entityType,
      entityId: entry.entityId,
      details: { recordId: entry.id, code, detail },
    });
  }

  private async updateEntityStatus(
    entityType: 'session' | 'movement',
    entityId: string,
    status: 'synced' | 'rejected' | 'error',
  ): Promise<void> {
    if (entityType === 'session') {
      const session = await this.db.sessions.get(entityId);
      if (session)
        await this.db.sessions.put({ ...session, syncStatus: status });
    } else {
      const movement = await this.db.movements.get(entityId);
      if (movement)
        await this.db.movements.put({ ...movement, syncStatus: status });
    }
  }

  private async getEntityUserId(entry: OutboxEntry): Promise<string> {
    if (entry.entityType === 'session')
      return (await this.db.sessions.get(entry.entityId))?.userId ?? 'unknown';
    return (await this.db.movements.get(entry.entityId))?.userId ?? 'unknown';
  }
}

async function dbOutboxDue(
  db: CajaDatabase,
  now: string,
): Promise<OutboxEntry[]> {
  const entries = await db.outbox.toArray();
  return entries
    .filter(
      (entry) =>
        entry.status === 'pending' ||
        (entry.status === 'error' &&
          (!entry.nextAttemptAt ||
            Date.parse(entry.nextAttemptAt) <= Date.parse(now))),
    )
    .sort((left, right) => left.sequence - right.sequence);
}

function chunk<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size)
    result.push(values.slice(index, index + size));
  return result;
}
