import Fastify from 'fastify';

const server = Fastify({ logger: true });

server.get('/health', async () => ({ status: 'ok' }));

server.post('/auth', async () => ({ token: 'demo-token', user: { id: 'demo', name: 'Usuario demo', role: 'cashier' } }));

server.post('/sync', async () => ({ accepted: [], rejected: [] }));

const port = Number(process.env.PORT ?? 3000);
server.listen({ host: '0.0.0.0', port }).catch((error) => {
  server.log.error(error);
  process.exit(1);
});
