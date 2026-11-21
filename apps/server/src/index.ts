import Fastify from 'fastify';
import cors from '@fastify/cors';
import { host, port } from './config';
import { registerHealthRoute } from './routes/health';

export function buildServer() {
  const server = Fastify({ logger: true });
  server.register(cors, { origin: true });
  registerHealthRoute(server);
  return server;
}

if (require.main === module) {
  buildServer().listen({ host, port }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
