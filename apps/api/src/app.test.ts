import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import type { DatabaseProbe } from './db/probe.js';

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

  it('can boot a production container before secrets are injected', async () => {
    const app = buildApp(loadConfig({ NODE_ENV: 'production' })); apps.push(app);
    const health = await app.inject({ method: 'GET', url: '/health' });
    const readiness = await app.inject({ method: 'GET', url: '/ready' });
    expect(health.statusCode).toBe(200);
    expect(readiness.statusCode).toBe(503);
  });

  it('reports ready only after a real database probe succeeds', async () => {
    const databaseProbe: DatabaseProbe = { check: async () => undefined, close: async () => undefined };
    const app = buildApp(loadConfig({ NODE_ENV: 'test' }), databaseProbe); apps.push(app);
    const response = await app.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ready', checks: { database: 'ok' } });
  });

  it('does not expose database errors from a failed probe', async () => {
    const databaseProbe: DatabaseProbe = {
      check: async () => { throw new Error('secret connection detail'); },
      close: async () => undefined,
    };
    const app = buildApp(loadConfig({ NODE_ENV: 'test' }), databaseProbe); apps.push(app);
    const response = await app.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'not_ready', checks: { database: 'unavailable' } });
    expect(response.body).not.toContain('secret connection detail');
  });

  it('rejects identity requests without verified CloudBase context', async () => {
    const app = buildApp(loadConfig({ NODE_ENV: 'test' })); apps.push(app);
    const response = await app.inject({ method: 'GET', url: '/v1/me' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthorized' });
  });

  it('returns only the verified CloudBase uid', async () => {
    const app = buildApp(loadConfig({ NODE_ENV: 'test' })); apps.push(app);
    const context = Buffer.from(JSON.stringify({ uid: 'cloudbase-user-1', accessToken: 'must-not-leak' })).toString('base64');
    const response = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { 'x-cloudbase-context': context },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ uid: 'cloudbase-user-1' });
    expect(response.body).not.toContain('must-not-leak');
  });

  it('rejects malformed CloudBase context without exposing parser details', async () => {
    const app = buildApp(loadConfig({ NODE_ENV: 'test' })); apps.push(app);
    const response = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { 'x-cloudbase-context': 'not-valid-base64-json' },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthorized' });
  });
});
