import Fastify from 'fastify';
import type { ApiConfig } from './config.js';

export function buildApp(config: ApiConfig) {
  const app = Fastify({ logger: config.nodeEnv !== 'test', trustProxy: true });
  app.get('/health', async () => ({ status: 'ok', service: 'daystep-api', version: '0.1.0' }));
  app.get('/ready', async (_request, reply) => {
    const configured = Boolean(config.databaseUrl);
    return reply.code(configured ? 200 : 503).send({ status: configured ? 'ready' : 'not_ready', checks: { database: configured ? 'configured' : 'missing' } });
  });
  return app;
}
