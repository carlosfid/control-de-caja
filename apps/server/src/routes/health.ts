import type { FastifyInstance } from 'fastify';
import { API_VERSION, SERVER_VERSION } from '../config';

export function registerHealthRoute(server: FastifyInstance): void {
  server.get('/health', async () => ({
    status: 'ok',
    version: SERVER_VERSION,
    apiVersion: API_VERSION,
    time: new Date().toISOString(),
  }));
}
