import Fastify from 'fastify';
import cors from '@fastify/cors';
import { host, port } from './config';
import { registerHealthRoute } from './routes/health';
import { registerSyncRoute } from './routes/sync';
import { registerAuthRoute } from './routes/auth';
import { registerDemoRoutes } from './routes/demo';
import { ServerDatabase } from './db/database';
import { SyncService } from './services/sync-service';
import { assertAuthConfiguration } from './auth/token';

export interface BuildServerOptions {
  databasePath?: string;
  amountLimitMinor?: number;
  forcedRejectCount?: number;
  latencyMs?: number;
  failNextCount?: number;
  loseResponseCount?: number;
}

export function buildServer(options: BuildServerOptions = {}) {
  assertAuthConfiguration();
  const server = Fastify({ logger: true, bodyLimit: 256 * 1024 });
  const database = new ServerDatabase(options.databasePath);
  const service = new SyncService(database, {
    amountLimitMinor: options.amountLimitMinor ?? 10_000_000,
    forcedRejectCount: options.forcedRejectCount ?? 0,
    latencyMs: options.latencyMs ?? 0,
    failNextCount: options.failNextCount ?? 0,
    loseResponseCount: options.loseResponseCount ?? 0,
  });

  server.register(cors, { origin: true });
  registerHealthRoute(server);
  registerAuthRoute(server);
  registerSyncRoute(server, service);
  registerDemoRoutes(server, service);

  server.addHook('onClose', async () => database.close());
  return server;
}

if (require.main === module) {
  buildServer()
    .listen({ host, port })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
