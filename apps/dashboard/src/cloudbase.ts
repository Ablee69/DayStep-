import cloudbase from '@cloudbase/js-sdk';

const env = import.meta.env.VITE_CLOUDBASE_ENV_ID;
const accessKey = import.meta.env.VITE_CLOUDBASE_PUBLISHABLE_KEY;

export const cloudbaseConfigured = Boolean(env && accessKey);

export const cloudbaseApp = cloudbaseConfigured
  ? cloudbase.init({
      env,
      region: import.meta.env.VITE_CLOUDBASE_REGION || 'ap-shanghai',
      accessKey,
      auth: { detectSessionInUrl: true },
    })
  : null;

export const cloudbaseAuth = cloudbaseApp?.auth ?? null;
