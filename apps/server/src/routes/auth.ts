import type { FastifyInstance } from 'fastify';
import { createAuthToken } from '../auth/token';
import { timingSafeEqual } from 'crypto';

const DEMO_PINS: Record<string, string> = {
  'user-cashier-ana': '1234',
  'user-supervisor-luis': '2345',
  'user-accountant-marta': '3456',
};

export function registerAuthRoute(server: FastifyInstance): void {
  server.post(
    '/auth/token',
    { bodyLimit: 4 * 1024 },
    async (request, reply) => {
      const body = request.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return reply.code(400).send({ code: 'INVALID_PAYLOAD' });
      }
      if (Object.keys(body).some((key) => key !== 'userId' && key !== 'pin')) {
        return reply.code(400).send({ code: 'INVALID_PAYLOAD' });
      }
      const { userId, pin } = body as { userId?: unknown; pin?: unknown };
      if (
        typeof userId !== 'string' ||
        typeof pin !== 'string' ||
        userId.length === 0 ||
        userId.length > 128 ||
        pin.length > 16
      ) {
        return reply.code(400).send({ code: 'INVALID_PAYLOAD' });
      }

      const expectedPin = Object.hasOwn(DEMO_PINS, userId)
        ? DEMO_PINS[userId]
        : '0000';
      const supplied = Buffer.from(pin);
      const expected = Buffer.from(expectedPin);
      const pinMatches =
        supplied.length === expected.length &&
        timingSafeEqual(supplied, expected);
      if (!Object.hasOwn(DEMO_PINS, userId) || !pinMatches) {
        return reply.code(401).send({ code: 'UNAUTHORIZED' });
      }

      return createAuthToken(userId);
    },
  );
}
