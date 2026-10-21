import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, Check, LoaderCircle, LockKeyhole } from 'lucide-react';
import { cloudbaseAuth, cloudbaseConfigured, loadCloudbaseIdentity } from './cloudbase';

export type SignedInIdentity = {
  displayName: string;
  workspaceName: string;
  role: string;
};

type AuthGateProps = {
  children: (session: { identity: SignedInIdentity; signOut: () => Promise<void> }) => ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const [status, setStatus] = useState<'checking' | 'signed-out' | 'signed-in'>('checking');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [identity, setIdentity] = useState<SignedInIdentity | null>(null);

  const loadIdentity = async () => {
    setIdentity(await loadCloudbaseIdentity());
  };

  useEffect(() => {
    if (!cloudbaseAuth) {
      setStatus('signed-out');
      return;
    }

    let active = true;
    void cloudbaseAuth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (!data?.session) return setStatus('signed-out');
      await loadIdentity();
      if (active) setStatus('signed-in');
    }).catch((reason: unknown) => {
      if (active) {
        setError(reason instanceof Error ? reason.message : '无法读取当前账号的 DayStep 工作空间。');
        setStatus('signed-out');
      }
    });

    const { data } = cloudbaseAuth.onAuthStateChange((_event, session) => {
      if (!active || session) return;
      setIdentity(null);
      setStatus('signed-out');
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!cloudbaseAuth || !username.trim() || !password) return;
    setSubmitting(true);
    setError('');
    try {
      const { data, error: authError } = await cloudbaseAuth.signInWithPassword({
        username: username.trim(),
        password,
      });
      if (authError) throw authError;
      if (!data?.session) throw new Error('登录未返回有效会话，请稍后重试。');
      await loadIdentity();
      setStatus('signed-in');
      setPassword('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '登录失败，请检查账号和密码。');
    } finally {
      setSubmitting(false);
    }
  };

  const signOut = async () => {
    if (!cloudbaseAuth) return;
    setIdentity(null);
    setStatus('signed-out');
    try {
      await cloudbaseAuth.signOut();
    } catch {
      setError('云端会话退出较慢；当前页面已锁定，请稍后重试登录。');
    }
  };

  if (status === 'checking') {
    return <main className="auth-loading"><LoaderCircle /><span>正在验证安全会话</span></main>;
  }
  if (status === 'signed-in' && identity) return children({ identity, signOut });

  return <main className="auth-page">
    <section className="auth-intro">
      <div className="auth-brand"><span>D</span><strong>DayStep</strong></div>
      <div>
        <span className="auth-kicker">DAYSTEP WORKSPACE</span>
        <h1>把每个目标，变成今天能完成的一步。</h1>
        <p>统一管理目标、阶段、任务、打卡与学习反馈。</p>
      </div>
      <ul>
        <li><Check />教师与学生使用独立身份</li>
        <li><Check />会话由 CloudBase 安全管理</li>
        <li><Check />计划内容不会发送给第三方 AI</li>
      </ul>
    </section>
    <section className="auth-panel">
      <form onSubmit={signIn}>
        <span className="auth-kicker">欢迎回来</span>
        <h2>登录 DayStep</h2>
        <p>使用管理员为你创建的用户名和密码。</p>
        {!cloudbaseConfigured && <div className="auth-error">当前环境尚未配置 CloudBase 前端密钥。</div>}
        <label>用户名<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="请输入用户名" /></label>
        <label>密码<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="请输入密码" /></label>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button type="submit" disabled={!cloudbaseConfigured || !username.trim() || !password || submitting}>
          {submitting ? <LoaderCircle className="auth-spinner" /> : <LockKeyhole />}
          {submitting ? '正在登录' : '安全登录'}
          {!submitting && <ArrowRight />}
        </button>
        <small>当前阶段由管理员创建账号；自助注册将在邮箱验证配置完成后开放。</small>
      </form>
    </section>
  </main>;
}
