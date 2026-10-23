import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, Check, ChevronRight, CircleAlert, Clock3, Inbox, LoaderCircle, LogOut, RefreshCw, Target } from 'lucide-react';
import type { SignedInIdentity } from './AuthGate';
import { loadTeacherProgress, type TeacherGoal, type TeacherProgressSnapshot } from './teacher-data';

type Props = { identity: SignedInIdentity; onSignOut?: () => Promise<void> };
const EMPTY: TeacherProgressSnapshot = { students: [], refreshedAt: '' };

function statusLabel(status: TeacherGoal['status']) {
  if (status === 'completed') return '已完成';
  if (status === 'draft') return '草稿';
  if (status === 'archived') return '已归档';
  return '进行中';
}

function StudentGoal({ goal }: { goal: TeacherGoal }) {
  const [open, setOpen] = useState(true);
  return <article className="student-cloud-goal">
    <button className="student-goal-summary" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
      <span className="student-goal-icon"><Target /></span>
      <span className="student-goal-copy"><small>{statusLabel(goal.status)}</small><strong>{goal.title}</strong><time>{goal.startDate || '未设开始日期'} 至 {goal.endDate || '未设截止日期'}</time></span>
      <span className="student-goal-progress"><strong>{goal.progress}%</strong><span className="bar"><i style={{ width: `${goal.progress}%` }} /></span><small>{goal.completedTaskCount}/{goal.taskCount} 个任务完成</small></span>
      <ChevronRight className={open ? 'rotated' : ''} />
    </button>
    {open && <div className="student-goal-tree">{goal.milestones.length === 0 ? <div className="student-cloud-empty compact"><Inbox /><span>老师还没有为这个目标添加阶段和任务</span></div> : goal.milestones.map((milestone) => <section key={milestone.id}>
      <header><span>阶段</span><strong>{milestone.title}</strong><b>{milestone.progress}%</b></header>
      {milestone.projects.map((project) => <div className="student-cloud-project" key={project.id}>
        <div><span>子项目</span><strong>{project.title}</strong><b>{project.progress}%</b></div>
        {project.tasks.map((task) => <div className="student-cloud-task" key={task.id}>
          <span className={task.progress === 100 ? 'student-task-state done' : 'student-task-state'}>{task.progress === 100 ? <Check /> : task.progress}</span>
          <span><strong>{task.title}</strong><small>{task.steps.length ? `${task.steps.filter((step) => step.completed).length}/${task.steps.length} 个步骤完成` : `状态：${task.status}`}</small></span>
          <b>{task.progress}%</b>
        </div>)}
      </div>)}
    </section>)}</div>}
  </article>;
}

export function StudentWorkspace({ identity, onSignOut }: Props) {
  const [snapshot, setSnapshot] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async (background = false) => {
    if (background) setRefreshing(true); else setLoading(true);
    setError('');
    try { setSnapshot(await loadTeacherProgress(identity.workspaceId)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '无法读取你的目标数据。'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [identity.workspaceId]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(true); }, 15_000);
    const focus = () => { void refresh(true); };
    window.addEventListener('focus', focus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [refresh]);

  const student = snapshot.students.find((item) => item.id === identity.userId) || snapshot.students[0];
  const taskCount = useMemo(() => student?.goals.reduce((sum, goal) => sum + goal.taskCount, 0) || 0, [student]);
  const completedCount = useMemo(() => student?.goals.reduce((sum, goal) => sum + goal.completedTaskCount, 0) || 0, [student]);
  if (loading) return <main className="teacher-live-loading"><LoaderCircle className="spin" /><strong>正在读取你的目标</strong><span>数据来自 DayStep 云端工作空间</span></main>;

  return <div className="student-cloud-shell">
    <header className="student-cloud-header"><div className="auth-brand"><span>D</span><strong>DayStep</strong></div><div className="student-cloud-user"><span>{identity.displayName.at(0)}</span><div><strong>{identity.displayName}</strong><small>{identity.workspaceName} · 学生</small></div>{onSignOut && <button aria-label="退出登录" title="退出登录" onClick={() => { void onSignOut(); }}><LogOut /></button>}</div></header>
    <main className="student-cloud-main">
      <section className="student-cloud-hero"><div><span className="eyebrow">学生工作空间 · 云端同步</span><h1>你好，{identity.displayName}</h1><p>这里显示老师为你安排的真实目标、阶段和执行任务。</p></div><button className="refresh-button" disabled={refreshing} onClick={() => { void refresh(true); }}><RefreshCw className={refreshing ? 'spin' : ''} />刷新</button></section>
      {error && <div className="workspace-error" role="alert"><CircleAlert />{error}<button onClick={() => { void refresh(); }}>重试</button></div>}
      <section className="student-cloud-metrics"><div><Target /><span><strong>{student?.goals.length || 0}</strong><small>长期目标</small></span></div><div><BookOpenCheck /><span><strong>{taskCount}</strong><small>执行任务</small></span></div><div><Check /><span><strong>{completedCount}</strong><small>已完成任务</small></span></div><div><Clock3 /><span><strong>{student?.progress || 0}%</strong><small>整体完成度</small></span></div></section>
      {!student || student.goals.length === 0 ? <section className="student-cloud-empty"><Inbox /><h2>暂时还没有目标</h2><p>你的账号已经安全加入工作空间。老师创建目标后，这里会自动出现，无需重新登录。</p></section> : <section className="student-cloud-goals"><header><div><span className="eyebrow">我的目标地图</span><h2>从长期目标到具体任务</h2></div><span>{student.goals.length} 个目标</span></header>{student.goals.map((goal) => <StudentGoal key={goal.id} goal={goal} />)}</section>}
      {snapshot.refreshedAt && <footer className="live-refresh-note">上次同步：{new Date(snapshot.refreshedAt).toLocaleTimeString('zh-CN')} · 页面每 15 秒自动刷新</footer>}
    </main>
  </div>;
}
