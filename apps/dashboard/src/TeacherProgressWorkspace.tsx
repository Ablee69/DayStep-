import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, CircleAlert, Inbox, LoaderCircle, RefreshCw, Save, X } from 'lucide-react';
import type { SignedInIdentity } from './AuthGate';
import { loadTeacherProgress, updateTeacherGoal, type GoalUpdate, type TeacherGoal, type TeacherProgressSnapshot } from './teacher-data';

type Props = {
  identity: SignedInIdentity;
  mode: 'students' | 'goals';
};

const EMPTY: TeacherProgressSnapshot = { students: [], refreshedAt: '' };

function formatTime(value: string | null) {
  if (!value) return '暂无打卡';
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function GoalEditor({ goal, close, saved }: { goal: TeacherGoal; close: () => void; saved: () => Promise<void> }) {
  const [draft, setDraft] = useState<GoalUpdate>({
    id: goal.id,
    title: goal.title,
    startDate: goal.startDate,
    endDate: goal.endDate,
    status: goal.status,
    version: goal.version,
  });
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');
  const submit = async () => {
    setState('saving');
    setError('');
    try {
      await updateTeacherGoal(draft);
      await saved();
      setState('saved');
      window.setTimeout(close, 650);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '目标保存失败。');
      setState('idle');
    }
  };
  return <div className="goal-editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) close(); }}>
    <section className="goal-editor" role="dialog" aria-modal="true" aria-label="编辑目标">
      <header><div><span className="eyebrow">云端目标</span><h2>编辑目标</h2></div><button className="icon-button" aria-label="关闭" onClick={close}><X /></button></header>
      <label>目标名称<input value={draft.title} maxLength={240} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <div className="goal-editor-dates"><label>开始日期<input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label><label>截止日期<input type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></label></div>
      <label>目标状态<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as TeacherGoal['status'] })}><option value="draft">草稿</option><option value="active">进行中</option><option value="completed">已完成</option><option value="archived">已归档</option></select></label>
      <div className="goal-editor-note"><CircleAlert />修改将写入云端，并对该学生立即生效。版本冲突时不会覆盖他人的更新。</div>
      {error && <div className="workspace-error" role="alert">{error}</div>}
      <footer><button className="editor-secondary" onClick={close}>取消</button><button className="editor-primary" disabled={state !== 'idle' || !draft.title.trim()} onClick={() => { void submit(); }}>{state === 'saving' ? <LoaderCircle className="spin" /> : state === 'saved' ? <Check /> : <Save />}{state === 'saving' ? '正在保存' : state === 'saved' ? '已保存' : '保存到云端'}</button></footer>
    </section>
  </div>;
}

function GoalHierarchy({ goal, edit }: { goal: TeacherGoal; edit: (goal: TeacherGoal) => void }) {
  const [open, setOpen] = useState(false);
  return <article className="live-goal-card">
    <div className="live-goal-row">
      <button className="goal-expand" aria-label={open ? '收起目标' : '展开目标'} onClick={() => setOpen(!open)}><ChevronRight className={open ? 'rotated' : ''} /></button>
      <div className="live-goal-title"><span>{goal.status === 'completed' ? '已完成' : goal.status === 'draft' ? '草稿' : goal.status === 'archived' ? '已归档' : '进行中'}</span><strong>{goal.title}</strong><small>{goal.startDate || '未设开始日期'} 至 {goal.endDate || '未设截止日期'}</small></div>
      <div className="live-progress"><strong>{goal.progress}%</strong><div className="bar"><i style={{ width: `${goal.progress}%` }} /></div><small>{goal.completedTaskCount}/{goal.taskCount} 个任务完成</small></div>
      <button className="edit-goal" onClick={() => edit(goal)}>编辑目标</button>
    </div>
    {open && <div className="live-goal-tree">{goal.milestones.length === 0 ? <div className="goal-empty-line">尚未建立阶段和任务</div> : goal.milestones.map((milestone) => <section key={milestone.id}><header><span>阶段</span><strong>{milestone.title}</strong><b>{milestone.progress}%</b></header>{milestone.projects.map((project) => <div className="live-project" key={project.id}><div><span>子项目</span><strong>{project.title}</strong><b>{project.progress}%</b></div>{project.tasks.map((task) => <div className="live-task" key={task.id}><span className={task.progress === 100 ? 'task-check done' : 'task-check'}>{task.progress === 100 ? <Check /> : task.progress}</span><span><strong>{task.title}</strong><small>{task.steps.length ? `${task.steps.filter((step) => step.completed).length}/${task.steps.length} 个步骤完成` : `状态：${task.status}`}</small></span><b>{task.progress}%</b></div>)}</div>)}</section>)}</div>}
  </article>;
}

export function TeacherProgressWorkspace({ identity, mode }: Props) {
  const [snapshot, setSnapshot] = useState(EMPTY);
  const [selectedId, setSelectedId] = useState('');
  const [editing, setEditing] = useState<TeacherGoal | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (background = false) => {
    if (background) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const next = await loadTeacherProgress(identity.workspaceId);
      setSnapshot(next);
      setSelectedId((current) => current && next.students.some((student) => student.id === current) ? current : next.students[0]?.id || '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法读取学生目标数据。');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [identity.workspaceId]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(true); }, 15_000);
    const focus = () => { void refresh(true); };
    window.addEventListener('focus', focus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [refresh]);

  const visibleStudents = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN');
    if (!keyword) return snapshot.students;
    return snapshot.students.filter((student) => `${student.displayName} ${student.goals.map((goal) => goal.title).join(' ')}`.toLocaleLowerCase('zh-CN').includes(keyword));
  }, [query, snapshot.students]);
  const selected = snapshot.students.find((student) => student.id === selectedId) || visibleStudents[0];
  const allGoals = snapshot.students.flatMap((student) => student.goals.map((goal) => ({ student, goal })));
  const overall = allGoals.length ? Math.round(allGoals.reduce((sum, item) => sum + item.goal.progress, 0) / allGoals.length) : 0;

  if (loading) return <main className="teacher-live-loading"><LoaderCircle className="spin" /><strong>正在读取学生目标</strong><span>数据来自 DayStep 云端工作空间</span></main>;

  return <main className="management-page teacher-live-page">
    <header className="page-heading"><div><span className="eyebrow">教师工作空间 · 云端数据</span><h1>{mode === 'students' ? '学生目标进度' : '目标地图'}</h1><p>{mode === 'students' ? '查看每位学生的真实目标、任务和步骤完成度。' : '统一查看并调整授权学生的长期目标。'}</p></div><div className="live-heading-actions"><label className="live-search"><input aria-label="搜索学生或目标" placeholder="搜索学生或目标" value={query} onChange={(event) => setQuery(event.target.value)} /></label><button className="refresh-button" disabled={refreshing} onClick={() => { void refresh(true); }}><RefreshCw className={refreshing ? 'spin' : ''} />刷新</button></div></header>
    {error && <div className="workspace-error" role="alert"><CircleAlert />{error}<button onClick={() => { void refresh(); }}>重试</button></div>}
    {snapshot.students.length === 0 ? <section className="teacher-empty"><Inbox /><h2>还没有已授权的学生</h2><p>学生加入当前工作空间并获得 student 角色后，会在这里显示。当前页面不会生成虚假学生或进度。</p></section> : mode === 'students' ? <section className="student-management-grid live-student-grid"><aside className="directory-panel"><div className="directory-summary"><strong>{snapshot.students.length}</strong><span>授权学生</span><strong>{allGoals.length}</strong><span>云端目标</span></div><div className="directory-list">{visibleStudents.map((student) => <button className={student.id === selected?.id ? 'selected' : ''} key={student.id} onClick={() => setSelectedId(student.id)}><span className="project-avatar">{student.displayName.at(0)}</span><span><strong>{student.displayName}</strong><small>{student.goals.length} 个目标 · 最近 {formatTime(student.lastActivity)}</small></span><b>{student.progress}%</b></button>)}</div></aside>{selected && <section className="student-detail-panel live-student-detail"><header className="student-detail-head"><span className="large-avatar">{selected.displayName.at(0)}</span><div><span className="eyebrow">学生档案</span><h2>{selected.displayName}</h2><p>加入于 {selected.joinedAt ? new Date(selected.joinedAt).toLocaleDateString('zh-CN') : '未知日期'}</p></div><span className="cloud-live"><i />云端同步</span></header><div className="detail-metrics"><div><strong>{selected.progress}%</strong><span>整体完成度</span></div><div><strong>{selected.goals.length}</strong><span>长期目标</span></div><div><strong>{selected.goals.reduce((sum, goal) => sum + goal.completedTaskCount, 0)}</strong><span>已完成任务</span></div><div><strong>{selected.averageScore ?? '--'}</strong><span>平均评分</span></div></div><div className="student-live-goals">{selected.goals.length ? selected.goals.map((goal) => <GoalHierarchy key={goal.id} goal={goal} edit={setEditing} />) : <div className="teacher-inline-empty"><Inbox /><span>该学生还没有目标</span></div>}</div></section>}</section> : <><section className="goal-overview"><div><strong>{snapshot.students.length}</strong><span>授权学生</span></div><div><strong>{allGoals.length}</strong><span>长期目标</span></div><div><strong>{overall}%</strong><span>整体完成率</span></div><div><strong>{allGoals.filter(({ goal }) => goal.status === 'active' && goal.progress < 50).length}</strong><span>需关注目标</span></div></section><section className="all-live-goals">{visibleStudents.flatMap((student) => student.goals.map((goal) => <div className="student-goal-group" key={goal.id}><div className="student-goal-owner"><span className="project-avatar">{student.displayName.at(0)}</span><span><strong>{student.displayName}</strong><small>学生目标</small></span></div><GoalHierarchy goal={goal} edit={setEditing} /></div>))}{visibleStudents.every((student) => student.goals.length === 0) && <div className="teacher-inline-empty"><Inbox /><span>目前没有云端目标</span></div>}</section></>}
    {snapshot.refreshedAt && <footer className="live-refresh-note">上次同步：{new Date(snapshot.refreshedAt).toLocaleTimeString('zh-CN')} · 页面每 15 秒自动刷新</footer>}
    {editing && <GoalEditor goal={editing} close={() => setEditing(null)} saved={() => refresh(true)} />}
  </main>;
}
