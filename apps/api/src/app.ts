import Fastify from 'fastify';
import type { ApiConfig } from './config.js';
import type { DatabaseProbe } from './db/probe.js';

type CloudbaseContext = {
  uid?: unknown;
};

function readCloudbaseUid(encodedContext: string | string[] | undefined) {
  if (typeof encodedContext !== 'string' || !encodedContext) return null;

  try {
    const context = JSON.parse(Buffer.from(encodedContext, 'base64').toString('utf8')) as CloudbaseContext;
    return typeof context.uid === 'string' && context.uid.trim() ? context.uid : null;
  } catch {
    return null;
  }
}

export function buildApp(config: ApiConfig, databaseProbe?: DatabaseProbe) {
  const app = Fastify({ logger: config.nodeEnv !== 'test', trustProxy: true });
  const allowedOrigins = new Set(config.corsAllowedOrigins);

  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (!origin || !allowedOrigins.has(origin)) return;

    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Vary', 'Origin');
    if (request.method === 'OPTIONS') {
      reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      reply.header('Access-Control-Max-Age', '86400');
      return reply.code(204).send();
    }
  });

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
  app.get('/v1/me', async (request, reply) => {
    const uid = readCloudbaseUid(request.headers['x-cloudbase-context']);
    if (!uid) return reply.code(401).send({ error: 'unauthorized' });
    return reply.code(200).send({ uid });
  });
  return app;
}
