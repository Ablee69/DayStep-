import Fastify from 'fastify';
import type { ApiConfig } from './config.js';
import type { DatabaseProbe } from './db/probe.js';

export function buildApp(config: ApiConfig, databaseProbe?: DatabaseProbe) {
  const app = Fastify({ logger: config.nodeEnv !== 'test', trustProxy: true });
  if (databaseProbe) app.addHook('onClose', () => databaseProbe.close());
  app.get('/health', async () => ({ status: 'ok', service: 'daystep-api', version: '0.1.0' }));
  app.get('/ready', async (_request, reply) => {
    if (!databaseProbe) {
      return reply.code(503).send({ status: 'not_ready', checks: { database: 'missing' } });
    }

    try {
      await databaseProbe.check();
      return reply.code(200).send({ status: 'ready', checks: { database: 'ok' } });
    } catch (error) {
      app.log.error({ err: error }, 'Database readiness probe failed');
      return reply.code(503).send({ status: 'not_ready', checks: { database: 'unavailable' } });
    }
  });
  return app;
}
