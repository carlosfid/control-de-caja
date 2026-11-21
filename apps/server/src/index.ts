import Fastify from 'fastify';
import cors from '@fastify/cors';
import { host, port } from './config';
import { registerHealthRoute } from './routes/health';
import { registerSyncRoute } from './routes/sync';
import { registerAuthRoute } from './routes/auth';
import { registerDemoRoutes } from './routes/demo';
import { ServerDatabase } from './db/database';
import { SyncService } from './services/sync-service';

export interface BuildServerOptions {
  databasePath?: string;
  amountLimitMinor?: number;
  forcedRejectCount?: number;
}

export function buildServer(options: BuildServerOptions = {}) {
  const server = Fastify({ logger: true });
  const database = new ServerDatabase(options.databasePath);
  const service = new SyncService(database, {
    amountLimitMinor: options.amountLimitMinor ?? 10_000_000,
    forcedRejectCount: options.forcedRejectCount ?? 0,
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
  buildServer().listen({ host, port }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
