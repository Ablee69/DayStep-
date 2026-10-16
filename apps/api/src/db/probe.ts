import postgres from 'postgres';
import type { ApiConfig } from '../config.js';

export type DatabaseProbe = {
  check(): Promise<void>;
  close(): Promise<void>;
};

const noopClose = async () => undefined;

function createCloudBaseProbe(config: ApiConfig): DatabaseProbe {
  const endpoint = `https://${config.cloudbaseEnvId}.api.tcloudbasegateway.com/v1/rdb/rest/users?select=id&limit=1`;

  return {
    async check() {
      const response = await fetch(endpoint, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${config.cloudbaseApiKey}`,
        },
        signal: AbortSignal.timeout(config.databaseProbeTimeoutMs),
      });

      if (!response.ok) {
        throw new Error(`CloudBase PostgreSQL probe failed with HTTP ${response.status}`);
      }
    },
    close: noopClose,
  };
}

function createDirectProbe(config: ApiConfig): DatabaseProbe {
  const sql = postgres(config.databaseUrl!, {
    connect_timeout: Math.max(1, Math.ceil(config.databaseProbeTimeoutMs / 1000)),
    idle_timeout: 5,
    max: 1,
  });

  return {
    async check() {
      await sql`select 1`;
    },
    async close() {
      await sql.end({ timeout: 2 });
    },
  };
}

export function createDatabaseProbe(config: ApiConfig): DatabaseProbe | undefined {
  if (config.cloudbaseEnvId && config.cloudbaseApiKey) return createCloudBaseProbe(config);
  if (config.databaseUrl) return createDirectProbe(config);
  return undefined;
}
