import type { FastifyInstance } from 'fastify';
import { signAuthToken } from '../auth/token';

const DEMO_PINS: Record<string, string> = {
  'user-cashier-ana': '1234',
  'user-supervisor-luis': '2345',
  'user-accountant-marta': '3456',
};

export function registerAuthRoute(server: FastifyInstance): void {
  server.post('/auth/token', async (request, reply) => {
    const body = request.body as { userId?: string; pin?: string } | undefined;
    if (!body?.userId || !body.pin) return reply.code(400).send({ code: 'INVALID_PAYLOAD' });
    if (DEMO_PINS[body.userId] !== body.pin) return reply.code(401).send({ code: 'UNAUTHORIZED' });

    const token = signAuthToken(body.userId);
    const payload = Buffer.from(token.split('.')[0], 'base64url').toString('utf8');
    const expiresAt = (JSON.parse(payload) as { expiresAt: string }).expiresAt;
    return { token, expiresAt, userId: body.userId };
  });
}
