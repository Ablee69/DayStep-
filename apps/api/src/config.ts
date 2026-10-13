export type ApiConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  databaseUrl?: string;
  cloudbaseEnvId?: string;
  cosBucket?: string;
  cosRegion?: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const nodeEnv = env.NODE_ENV || 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) throw new Error('NODE_ENV must be development, test, or production');
  const port = Number(env.PORT || 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');
  if (nodeEnv === 'production' && !env.DATABASE_URL) throw new Error('DATABASE_URL is required in production');
  return {
    nodeEnv: nodeEnv as ApiConfig['nodeEnv'], host: env.HOST || '127.0.0.1', port,
    databaseUrl: env.DATABASE_URL, cloudbaseEnvId: env.CLOUDBASE_ENV_ID,
    cosBucket: env.COS_BUCKET, cosRegion: env.COS_REGION,
  };
}
