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

export type CloudbaseIdentity = {
  userId: string;
  workspaceId: string;
  displayName: string;
  workspaceName: string;
  role: string;
};

function requiredString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`账号资料缺少 ${field}。`);
  return value;
}

export async function loadCloudbaseIdentity(): Promise<CloudbaseIdentity> {
  if (!cloudbaseApp || !cloudbaseAuth) throw new Error('CloudBase 数据库尚未配置。');
  const db = cloudbaseApp.rdb();
  const [profileResult, workspaceResult, membershipResult] = await Promise.all([
    db.from('profiles').select('user_id,display_name').limit(1).single(),
    db.from('workspaces').select('id,name,type').limit(1).single(),
    db.from('workspace_members').select('workspace_id,role').limit(1).single(),
  ]);
  for (const [label, result] of [
    ['账号资料', profileResult],
    ['工作空间', workspaceResult],
    ['成员身份', membershipResult],
  ] as const) {
    if (result.error) {
      const code = typeof result.error.code === 'string' ? ` (${result.error.code})` : '';
      throw new Error(`无法读取${label}${code}，请联系管理员检查账号关联和访问权限。`);
    }
  }
  if (!profileResult.data || !workspaceResult.data || !membershipResult.data) {
    throw new Error('当前账号尚未关联 DayStep 工作空间，请联系管理员。');
  }
  return {
    userId: requiredString(profileResult.data.user_id, '用户标识'),
    workspaceId: requiredString(membershipResult.data.workspace_id, '工作空间标识'),
    displayName: requiredString(profileResult.data.display_name, '显示名称'),
    workspaceName: requiredString(workspaceResult.data.name, '工作空间名称'),
    role: requiredString(membershipResult.data.role, '成员角色'),
  };
}
