export type ApiConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  databaseUrl?: string;
  cloudbaseEnvId?: string;
  cloudbaseApiKey?: string;
  databaseProbeTimeoutMs: number;
  cosBucket?: string;
  cosRegion?: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const nodeEnv = env.NODE_ENV || 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) throw new Error('NODE_ENV must be development, test, or production');
  const port = Number(env.PORT || 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');
  const databaseProbeTimeoutMs = Number(env.DATABASE_PROBE_TIMEOUT_MS || 3000);
  if (!Number.isInteger(databaseProbeTimeoutMs) || databaseProbeTimeoutMs < 100 || databaseProbeTimeoutMs > 30000) {
    throw new Error('DATABASE_PROBE_TIMEOUT_MS must be between 100 and 30000');
  }
  return {
    nodeEnv: nodeEnv as ApiConfig['nodeEnv'], host: env.HOST || (nodeEnv === 'production' ? '0.0.0.0' : '127.0.0.1'), port,
    databaseUrl: env.DATABASE_URL, cloudbaseEnvId: env.CLOUDBASE_ENV_ID,
    cloudbaseApiKey: env.CLOUDBASE_APIKEY, databaseProbeTimeoutMs,
    cosBucket: env.COS_BUCKET, cosRegion: env.COS_REGION,
  };
}
