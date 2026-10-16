import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createDatabaseProbe } from './db/probe.js';

const config = loadConfig();
const app = buildApp(config, createDatabaseProbe(config));

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
