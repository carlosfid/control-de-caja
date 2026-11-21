import type { FastifyInstance } from 'fastify';
import type { SyncRequest } from '../contracts/sync';
import type { SyncService } from '../services/sync-service';
import { verifyAuthToken } from '../auth/token';

export function registerSyncRoute(server: FastifyInstance, service: SyncService): void {
  server.post('/sync', async (request, reply) => {
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!verifyAuthToken(token)) return reply.code(401).send({ code: 'UNAUTHORIZED' });

    const body = request.body as Partial<SyncRequest> | undefined;
    if (!body || typeof body.deviceId !== 'string' || typeof body.sentAt !== 'string' || !Array.isArray(body.records)) {
      return reply.code(400).send({ code: 'INVALID_PAYLOAD' });
    }

    const validKinds = body.records.every((record) =>
      typeof record.recordId === 'string' &&
      (record.kind === 'session' || record.kind === 'movement') &&
      typeof record.payload === 'object'
    );
    if (!validKinds) return reply.code(400).send({ code: 'INVALID_PAYLOAD' });

    return service.process(body as SyncRequest);
  });
}
