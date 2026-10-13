import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const apps: ReturnType<typeof buildApp>[] = [];
afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

describe('DayStep API foundation', () => {
  it('reports liveness without external services', async () => {
    const app = buildApp(loadConfig({ NODE_ENV: 'test' })); apps.push(app);
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok', service: 'daystep-api' });
  });

  it('does not report ready before the database is configured', async () => {
    const app = buildApp(loadConfig({ NODE_ENV: 'test' })); apps.push(app);
    const response = await app.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ status: 'not_ready' });
  });
});
