import type { FastifyInstance } from 'fastify';
import type { SyncRequest } from '../contracts/sync';
import type { SyncService } from '../services/sync-service';
import { verifyAuthToken } from '../auth/token';
import { isSyncRequest } from '../../../../packages/domain/src/sync-contract';

export function registerSyncRoute(
  server: FastifyInstance,
  service: SyncService,
): void {
  server.post('/sync', { bodyLimit: 256 * 1024 }, async (request, reply) => {
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : '';
    const authenticatedUser = verifyAuthToken(token);
    if (!authenticatedUser)
      return reply.code(401).send({ code: 'UNAUTHORIZED' });

    if (!isSyncRequest(request.body)) {
      return reply.code(400).send({ code: 'INVALID_PAYLOAD' });
    }

    await service.waitForConfiguredLatency();
    if (service.takeHttpFailure())
      return reply.code(503).send({ code: 'DEMO_UNAVAILABLE' });

    const response = service.process(
      request.body as SyncRequest,
      authenticatedUser.userId,
    );
    if (service.takeLostResponse()) {
      reply.hijack();
      reply.raw.destroy();
      return reply;
    }
    return response;
  });
}
