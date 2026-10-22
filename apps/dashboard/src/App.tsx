import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight, Bell, BookOpenCheck, CalendarDays, Check, CheckCheck, ChevronLeft, ChevronRight,
  ClipboardCheck, Download, Inbox, LayoutDashboard, MessageSquareText, MoreHorizontal,
  LogOut, PanelLeftClose, Search, Send, Settings, Sparkles, Upload, Users, X,
} from 'lucide-react';
import type { Assignment } from '@daystep/domain';
import type { SignedInIdentity } from './AuthGate';
import { TeacherProgressWorkspace } from './TeacherProgressWorkspace';

type View = 'dashboard' | 'students' | 'plans' | 'goals' | 'review' | 'feedback' | 'settings';
type DashboardPanel = 'new-plan' | 'students' | 'insight' | 'student' | 'notifications' | null;

const assignments: Assignment[] = [
  { id: 'a1', student: '林晓晴', title: '概率综合练习 · 第 3 章', subject: '数学 A', submittedAt: '今天 09:42', status: 'pending', files: ['作业第1页.jpg', '作业第2页.jpg'] },
  { id: 'a2', student: '陈子轩', title: '托福阅读 TPO 54', subject: '英语', submittedAt: '今天 08:15', status: 'reviewing', files: ['TPO54.pdf'] },
  { id: 'a3', student: '周语彤', title: '二次函数错题订正', subject: '数学', submittedAt: '昨天 21:06', status: 'revision', files: ['订正.pdf'] },
];

const students = [
  { name: '林晓晴', course: '学测数学 A', progress: 78, score: 88, color: '#ddd3f8', attention: false },
  { name: '陈子轩', course: '托福备考', progress: 64, score: 81, color: '#dcebdc', attention: true },
  { name: '周语彤', course: '八年级数学', progress: 86, score: 93, color: '#f2dfc1', attention: false },
];

type StudentProject = (typeof students)[number] & { id: string; title: string; deadline?: string };
const initialProjects: StudentProject[] = students.map((student, index) => ({ ...student, id: `project-${index + 1}`, title: `${student.name}的学习计划` }));

type StudentFilter = 'all' | 'active' | 'attention';
type SavedReview = { score: string; comment: string; annotation: string; status: string; needsRevision: boolean; feedbackFile: string; published: boolean };

const PROJECTS_KEY = 'daystep.dashboard.projects.v1';
const INVITES_KEY = 'daystep.dashboard.invites.v1';
const REVIEWS_KEY = 'daystep.dashboard.reviews.v1';
const SETTINGS_KEY = 'daystep.dashboard.settings.v1';

function readStored<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}

export function filterStudents<T extends (typeof students)[number]>(query: string, filter: StudentFilter, source: T[] = students as T[]) {
  const keyword = query.trim().toLocaleLowerCase('zh-CN');
  return source.filter((student) => {
    const matchesQuery = !keyword || `${student.name} ${student.course}`.toLocaleLowerCase('zh-CN').includes(keyword);
    const matchesFilter = filter === 'all' || (filter === 'active' ? student.progress < 100 : student.attention);
    return matchesQuery && matchesFilter;
  });
}

export function isValidScore(value: string) {
  if (value.trim() === '') return false;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 100;
}

function Sidebar({ view, setView, identity, onSignOut }: { view: View; setView: (view: View) => void; identity?: SignedInIdentity; onSignOut?: () => Promise<void> }) {
  const displayName = identity?.displayName || '秦老师';
  const workspaceName = identity?.workspaceName || '数学 · 英语';
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark">D</span><span>DayStep</span></div>
    <nav aria-label="主要导航">
      <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}><LayoutDashboard />总览</button>
      <button className={view === 'students' ? 'active' : ''} onClick={() => setView('students')}><Users />学生</button><button className={view === 'plans' ? 'active' : ''} onClick={() => setView('plans')}><CalendarDays />计划</button><button className={view === 'goals' ? 'active' : ''} onClick={() => setView('goals')}><BookOpenCheck />目标</button>
      <button className={view === 'review' ? 'active' : ''} onClick={() => setView('review')}><ClipboardCheck />作业批改<span className="nav-count">3</span></button>
      <button className={view === 'feedback' ? 'active' : ''} onClick={() => setView('feedback')}><MessageSquareText />反馈</button>
    </nav>
    <div className="sidebar-bottom"><button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}><Settings />设置</button><div className="teacher"><span>{displayName.at(0)}</span><div><strong>{displayName}</strong><small>{workspaceName}</small></div>{onSignOut ? <button type="button" className="teacher-signout" aria-label="退出登录" title="退出登录" onClick={() => { void onSignOut(); }}><LogOut /></button> : <MoreHorizontal />}</div></div>
  </aside>;
}

function Topbar({ title, query = '', onQueryChange, onNewPlan, onNotifications }: { title: string; query?: string; onQueryChange?: (value: string) => void; onNewPlan?: () => void; onNotifications?: () => void }) {
  return <header className="topbar" aria-label={title}><button className="icon-button mobile-menu" aria-label="收起侧栏"><PanelLeftClose /></button><label className="search"><Search /><input aria-label="搜索学生、目标或作业" placeholder="搜索学生、目标或作业" value={query} onChange={(event) => onQueryChange?.(event.target.value)} /></label><div className="topbar-actions"><button className="icon-button" aria-label="通知" onClick={onNotifications}><Bell /><i /></button><button className="new-plan" onClick={onNewPlan}><Sparkles />新建计划</button><span className="topbar-avatar">秦</span></div></header>;
}

function DashboardDialog({ panel, studentName, close, savePlan, sendInvite, invites }: { panel: Exclude<DashboardPanel, null>; studentName?: string; close: () => void; savePlan: (student: string, title: string, deadline: string) => void; sendInvite: (email: string) => void; invites: string[] }) {
  const [planStudent, setPlanStudent] = useState('林晓晴');
  const [planTitle, setPlanTitle] = useState('阶段学习计划');
  const [deadline, setDeadline] = useState('2026-12-31');
  const [inviteEmail, setInviteEmail] = useState('');
  const content = {
    'new-plan': { eyebrow: '计划设置', title: '新建学习计划', body: <><label>选择学生<select value={planStudent} onChange={(event) => setPlanStudent(event.target.value)}>{students.map((student) => <option key={student.name}>{student.name}</option>)}</select></label><label>计划名称<input value={planTitle} onChange={(event) => setPlanTitle(event.target.value)} /></label><label>目标日期<input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label></> },
    students: { eyebrow: '学生管理', title: '当前学生', body: <><label>邀请学生<input type="email" placeholder="student@example.com" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} /></label><div className="dialog-students">{students.map((student) => <div key={student.name}><span className="project-avatar" style={{ background: student.color }}>{student.name.at(0)}</span><span><strong>{student.name}</strong><small>{student.course}</small></span><b>{student.progress}%</b></div>)}{invites.map((email) => <div key={email}><span className="project-avatar">邀</span><span><strong>{email}</strong><small>等待学生接受邀请</small></span><b>待加入</b></div>)}</div></> },
    insight: { eyebrow: '智能建议', title: '本周重点关注', body: <div className="insight-copy"><strong>陈子轩的托福计划进度偏慢</strong><p>本周完成率为 64%，建议优先检查阅读任务的时间安排，并在周五复盘时调整下周任务量。</p></div> },
    student: { eyebrow: '学生概览', title: studentName || '学生项目', body: <div className="insight-copy"><strong>本周学习状态稳定</strong><p>已完成 5 项任务，当前有 1 份作业待批改。最近一次打卡为今天 09:42。</p></div> },
    notifications: { eyebrow: '通知', title: '最新动态', body: <div className="dialog-students"><div><span className="project-avatar">林</span><span><strong>林晓晴提交了新作业</strong><small>今天 09:42</small></span></div><div><span className="project-avatar">陈</span><span><strong>陈子轩完成今日任务</strong><small>今天 08:15</small></span></div></div> },
  }[panel];
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="dashboard-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button className="icon-button dialog-close" aria-label="关闭" onClick={close}><X /></button><span className="eyebrow">{content.eyebrow}</span><h2 id="dialog-title">{content.title}</h2><div className="dialog-body">{content.body}</div><div className="dialog-actions"><button className="ghost-button" onClick={close}>取消</button>{panel === 'new-plan' && <button className="publish" disabled={!planTitle.trim()} onClick={() => savePlan(planStudent, planTitle.trim(), deadline)}>保存计划</button>}{panel === 'students' && <button className="publish" disabled={!inviteEmail.includes('@')} onClick={() => sendInvite(inviteEmail.trim().toLowerCase())}>发送邀请</button>}</div></section></div>;
}

function TeacherDashboard({ openReview, createOnOpen = false }: { openReview: () => void; createOnOpen?: boolean }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StudentFilter>('all');
  const [panel, setPanel] = useState<DashboardPanel>(createOnOpen ? 'new-plan' : null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [monthOffset, setMonthOffset] = useState(0);
  const [projects, setProjects] = useState(() => readStored(PROJECTS_KEY, initialProjects));
  const [invites, setInvites] = useState(() => readStored<string[]>(INVITES_KEY, []));
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [toast, setToast] = useState('');
  const visibleStudents = useMemo(() => filterStudents(query, filter, projects), [query, filter, projects]);
  useEffect(() => localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects)), [projects]);
  useEffect(() => localStorage.setItem(INVITES_KEY, JSON.stringify(invites)), [invites]);
  const savePlan = (studentName: string, title: string, deadline: string) => {
    const student = students.find((item) => item.name === studentName) || students[0];
    setProjects((current) => [...current, { ...student, id: `project-${Date.now()}`, title, deadline, progress: 0, score: 0 }]);
    setPanel(null);
    setFilter('all');
    setToast(`已为${studentName}创建“${title}”`);
    window.setTimeout(() => setToast(''), 2600);
  };
  const sendInvite = (email: string) => {
    if (!invites.includes(email)) setInvites((current) => [...current, email]);
    setPanel(null);
    setToast(`邀请已发送至 ${email}`);
    window.setTimeout(() => setToast(''), 2600);
  };
  const previewState = new URLSearchParams(window.location.search).get('state');
  return <><Topbar title="下午好，秦老师" query={query} onQueryChange={setQuery} onNewPlan={() => setPanel('new-plan')} onNotifications={() => setPanel('notifications')} /><main className="dashboard-grid">
    <section className="workspace-heading"><div><span className="eyebrow">教师工作空间</span><h1>学生项目</h1></div><div className="heading-tools"><button className="icon-button" aria-label="智能建议" onClick={() => setPanel('insight')}><Sparkles /></button><button className="ghost-button" onClick={() => setPanel('students')}>管理学生</button></div><nav className="project-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>全部目标 <b>{projects.length}</b></button><button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>进行中 <b>{projects.filter((item) => item.progress < 100).length}</b></button><button className={filter === 'attention' ? 'active' : ''} onClick={() => setFilter('attention')}>待关注 <b>{projects.filter((item) => item.attention).length}</b></button><button onClick={openReview}>待批改 <b>3</b></button></nav></section>
    <section className="student-projects" aria-label="学生项目列表">{previewState === 'loading' ? <div className="project-state loading-state"><span /><span /><span /></div> : previewState === 'error' ? <div className="project-state"><Inbox /><strong>暂时无法载入项目</strong><small>请检查网络后重新加载页面</small><button onClick={() => window.location.reload()}>重新加载</button></div> : previewState === 'empty' || visibleStudents.length === 0 ? <div className="project-state"><Search /><strong>没有找到匹配的项目</strong><small>试试其他学生姓名、课程或筛选条件</small>{query && <button onClick={() => setQuery('')}>清除搜索</button>}</div> : visibleStudents.map((student, index) => <button className={`student-project ${index === 0 ? 'featured' : ''}`} key={student.id} onClick={() => { setSelectedStudent(student.name); setPanel('student'); }}><div className="project-card-top"><span className="project-avatar" style={{ background: student.color }}>{student.name.at(0)}</span><span className="project-more">•••</span></div><span className="project-course">{student.course}</span><strong>{student.title}</strong><div className="project-progress"><span>{student.progress}%</span><div className="bar"><i style={{ width: `${student.progress}%` }} /></div></div><small>本周得分 {student.score} · 今天有 3 项任务</small><ArrowUpRight /></button>)}</section>
    <section className="statistics"><div className="section-heading"><div><span className="eyebrow">学习统计</span><h2>{period === 'week' ? '本周完成趋势' : '本月完成趋势'}</h2></div><select aria-label="统计周期" value={period} onChange={(event) => setPeriod(event.target.value as 'week' | 'month')}><option value="week">本周</option><option value="month">本月</option></select></div><div className="chart-legend"><span><i className="current" />{period === 'week' ? '本周' : '本月'}</span><span><i />{period === 'week' ? '上周' : '上月'}</span></div><div className="line-chart" role="img" aria-label="本周与上周完成趋势折线图"><div className="grid-lines"><i /><i /><i /><i /></div><svg viewBox="0 0 700 230" preserveAspectRatio="none"><polyline className="previous-line" points="0,202 80,154 160,172 240,88 320,140 400,92 480,120 560,44 640,88 700,28"/><polyline className="current-line" points={period === 'week' ? '0,210 80,178 160,102 240,136 320,72 400,82 480,36 560,118 640,52 700,16' : '0,198 80,160 160,146 240,110 320,132 400,74 480,90 560,42 640,64 700,24'}/><circle cx="560" cy="118" r="7" /></svg><div className="chart-axis">{(period === 'week' ? ['一','二','三','四','五','六','日'] : ['1周','2周','3周','4周','5周']).map((day) => <span key={day}>{day}</span>)}</div></div></section>
    <section className="today-panel"><div className="today-heading"><div><span className="eyebrow">2026 年 {10 + monthOffset} 月</span><h2>今天</h2></div><div className="calendar-nav"><button aria-label="上个月" onClick={() => setMonthOffset(monthOffset - 1)}><ChevronLeft /></button><button aria-label="下个月" onClick={() => setMonthOffset(monthOffset + 1)}><ChevronRight /></button></div></div><div className="month-grid">{['日','一','二','三','四','五','六','4','5','6','7','8','9','10','11','12','13','14','15','16','17'].map((day, index) => <span className={day === '10' ? 'selected' : index < 7 ? 'weekday' : ''} key={`${day}-${index}`}>{day}</span>)}</div><button className="today-task" onClick={openReview}><span className="task-time-large">14:00</span><strong>林晓晴 · 计划复盘</strong><small>检查阶段进度与待批改作业</small><span className="task-people"><i>林</i><i>秦</i></span><Check /></button></section>
  </main>{panel && <DashboardDialog panel={panel} studentName={selectedStudent} close={() => setPanel(null)} savePlan={savePlan} sendInvite={sendInvite} invites={invites} />}{toast && <div className="action-toast" role="status"><Check />{toast}</div>}</>;
}

function ReviewWorkspace({ close }: { close: () => void }) {
  const [selectedId, setSelectedId] = useState('a1');
  const [score, setScore] = useState('88');
  const [comment, setComment] = useState('思路完整，组合数计算正确。第 4 题请补充事件互斥的判断依据。');
  const [annotation, setAnnotation] = useState('第 2 题：补充互斥事件可以直接相加的理由。');
  const [published, setPublished] = useState(false);
  const [tool, setTool] = useState<'批注' | '高亮' | '文字'>('批注');
  const [status, setStatus] = useState('graded');
  const [needsRevision, setNeedsRevision] = useState(false);
  const [feedbackFile, setFeedbackFile] = useState('');
  const selected = useMemo(() => assignments.find((item) => item.id === selectedId)!, [selectedId]);
  const scoreInvalid = !isValidScore(score);
  useEffect(() => {
    const saved = readStored<Record<string, SavedReview>>(REVIEWS_KEY, {})[selectedId];
    setScore(saved?.score || '88'); setComment(saved?.comment || '思路完整，组合数计算正确。第 4 题请补充事件互斥的判断依据。');
    setAnnotation(saved?.annotation || '第 2 题：补充互斥事件可以直接相加的理由。'); setStatus(saved?.status || 'graded'); setNeedsRevision(saved?.needsRevision || false); setFeedbackFile(saved?.feedbackFile || ''); setPublished(saved?.published || false);
  }, [selectedId]);
  const publishReview = () => {
    const reviews = readStored<Record<string, SavedReview>>(REVIEWS_KEY, {});
    reviews[selectedId] = { score, comment: comment.trim(), annotation: annotation.trim(), status, needsRevision, feedbackFile, published: true };
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews)); setPublished(true);
  };
  const publishBatch = () => {
    const reviews = readStored<Record<string, SavedReview>>(REVIEWS_KEY, {});
    assignments.forEach((item) => { reviews[item.id] ||= { score: '85', comment: '已完成批量检查，请按反馈继续完善。', annotation: '', status: 'graded', needsRevision: false, feedbackFile: '', published: true }; });
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
    const saved = reviews[selectedId]; setScore(saved.score); setComment(saved.comment); setAnnotation(saved.annotation); setStatus(saved.status); setNeedsRevision(saved.needsRevision); setFeedbackFile(saved.feedbackFile); setPublished(true);
  };
  return <><Topbar title="作业批改" /><main className="review-layout">
    <aside className="review-queue"><div className="queue-title"><div><span className="eyebrow">批改队列</span><h2>待处理 {assignments.filter((item) => !readStored<Record<string, SavedReview>>(REVIEWS_KEY, {})[item.id]?.published).length}</h2></div><button className="icon-button" aria-label="批量发布有效评分" title="批量发布有效评分" onClick={publishBatch}><CheckCheck /></button></div>{assignments.map((item) => <button className={`queue-item ${selected.id === item.id ? 'selected' : ''}`} key={item.id} onClick={() => { setSelectedId(item.id); setPublished(false); }}><span className="avatar">{item.student.at(0)}</span><span><strong>{item.student}</strong><small>{item.title}</small><time>{item.submittedAt}</time></span></button>)}</aside>
    <section className="document-viewer"><div className="document-toolbar"><div><button className="icon-button" aria-label="返回总览" onClick={close}><ChevronLeft /></button><strong>{selected.title}</strong></div><div>{(['批注','高亮','文字'] as const).map((name) => <button className={tool === name ? 'tool active' : 'tool'} key={name} onClick={() => setTool(name)}>{name}</button>)}<button className="icon-button" aria-label="下载原文件" disabled title="真实文件接入后开放"><Download /></button></div></div><div className="paper"><div className="paper-heading"><span>{selected.subject}</span><h2>{selected.title}</h2><p>姓名：{selected.student}　日期：2026-10-10</p></div><ol><li>袋中有 4 个红球、3 个白球，任取两个球，求颜色相同的概率。<div className="answer">C(4,2) + C(3,2) / C(7,2) = 9 / 21 = 3 / 7</div><span className="mark correct"><Check />正确</span></li><li>甲、乙两事件互斥，P(A)=0.3，P(B)=0.4，求 P(A∪B)。<div className="answer">P(A∪B) = 0.3 + 0.4 = 0.7</div><span className="annotation">请写出“互斥事件”条件为何允许直接相加。</span></li><li>完成树状图并列出所有可能结果。<div className="tree-placeholder">学生作答图像 · 第 2 页</div></li></ol></div><div className="page-counter">第 1 页 / 共 {selected.files.length} 页</div></section>
    <aside className="feedback-panel"><div className="student-header"><span className="avatar">{selected.student.at(0)}</span><div><strong>{selected.student}</strong><small>{selected.subject}</small></div><button className="icon-button" aria-label="关闭批改" onClick={close}><X /></button></div><div className="meta"><span>提交时间</span><strong>{selected.submittedAt}</strong><span>附件</span><strong>{selected.files.length} 个文件</strong></div><label>得分<div className="score-input"><input className={scoreInvalid ? 'invalid' : ''} value={score} onChange={(event) => { setScore(event.target.value); setPublished(false); }} inputMode="numeric" /><span>/ 100</span></div>{scoreInvalid && <small className="field-error">请输入 0–100 的分数</small>}</label><label>批改状态<select value={status} onChange={(event) => { setStatus(event.target.value); setPublished(false); }}><option value="reviewing">批改中</option><option value="graded">已批改</option><option value="revision">需订正</option></select></label><label>页内批注<textarea className="annotation-input" value={annotation} onChange={(event) => { setAnnotation(event.target.value); setPublished(false); }} /></label><label>教师评语<textarea value={comment} onChange={(event) => { setComment(event.target.value); setPublished(false); }} /></label><label className="check-row"><input type="checkbox" checked={needsRevision} onChange={(event) => { setNeedsRevision(event.target.checked); setStatus(event.target.checked ? 'revision' : 'graded'); setPublished(false); }} />需要学生订正后重交</label><button className={feedbackFile ? 'upload-feedback uploaded' : 'upload-feedback'} onClick={() => { setFeedbackFile('批改反馈.pdf'); setPublished(false); }}><Upload />{feedbackFile || '上传批改文件'}</button>{published ? <div className="published"><Check />反馈已发布给学生并保存</div> : <button className="publish" disabled={scoreInvalid || !comment.trim()} onClick={publishReview}><Send />发布评分与反馈</button>}</aside>
  </main></>;
}

function DemoStudentsWorkspace({ openReview }: { openReview: () => void }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(students[0].name);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invites, setInvites] = useState(() => readStored<string[]>(INVITES_KEY, []));
  const visible = students.filter((student) => `${student.name} ${student.course}`.toLocaleLowerCase('zh-CN').includes(query.trim().toLocaleLowerCase('zh-CN')));
  const current = students.find((student) => student.name === selected) || students[0];
  const invite = () => { const email = inviteEmail.trim().toLowerCase(); if (!email.includes('@') || invites.includes(email)) return; const next = [...invites, email]; setInvites(next); localStorage.setItem(INVITES_KEY, JSON.stringify(next)); setInviteEmail(''); };
  return <><Topbar title="学生管理" query={query} onQueryChange={setQuery} /><main className="management-page"><header className="page-heading"><div><span className="eyebrow">教师工作空间</span><h1>学生管理</h1><p>查看学习状态、邀请成员并进入作业批改。</p></div><div className="invite-inline"><input aria-label="学生邮箱" placeholder="student@example.com" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} /><button disabled={!inviteEmail.includes('@')} onClick={invite}>发送邀请</button></div></header><section className="student-management-grid"><div className="directory-panel"><div className="directory-summary"><strong>{students.length}</strong><span>正式学生</span><strong>{invites.length}</strong><span>待接受邀请</span></div><div className="directory-list">{visible.map((student) => <button className={student.name === current.name ? 'selected' : ''} key={student.name} onClick={() => setSelected(student.name)}><span className="project-avatar" style={{ background: student.color }}>{student.name.at(0)}</span><span><strong>{student.name}</strong><small>{student.course}</small></span><b>{student.progress}%</b></button>)}</div>{invites.length > 0 && <div className="pending-invites"><span className="eyebrow">待加入</span>{invites.map((email) => <div key={email}><span>{email}</span><b>邀请已发送</b></div>)}</div>}</div><article className="student-detail-panel"><div className="student-detail-head"><span className="large-avatar" style={{ background: current.color }}>{current.name.at(0)}</span><div><span className="eyebrow">学生档案</span><h2>{current.name}</h2><p>{current.course}</p></div><button onClick={openReview}>查看待批改</button></div><div className="detail-metrics"><div><strong>{current.progress}%</strong><span>计划进度</span></div><div><strong>{current.score}</strong><span>本周评分</span></div><div><strong>8 天</strong><span>连续打卡</span></div><div><strong>{current.attention ? '需关注' : '稳定'}</strong><span>学习状态</span></div></div><section className="activity-panel"><span className="eyebrow">最近动态</span><div><Check /><span><strong>完成今日阅读任务</strong><small>今天 09:42 · 45 分钟</small></span></div><div><Upload /><span><strong>提交阶段作业</strong><small>昨天 21:06 · 2 个附件</small></span></div><div><CalendarDays /><span><strong>确认下周计划</strong><small>10 月 10 日 · 共 6 项任务</small></span></div></section></article></section></main></>;
}

function PlansWorkspace({ createPlan }: { createPlan: () => void }) {
  const [status, setStatus] = useState<'all' | 'active' | 'done'>('all');
  const [query, setQuery] = useState('');
  const projects = readStored<StudentProject[]>(PROJECTS_KEY, initialProjects);
  const visible = projects.filter((project) => (!query.trim() || `${project.title} ${project.name} ${project.course}`.toLocaleLowerCase('zh-CN').includes(query.trim().toLocaleLowerCase('zh-CN'))) && (status === 'all' || (status === 'done' ? project.progress === 100 : project.progress < 100)));
  return <><Topbar title="计划管理" query={query} onQueryChange={setQuery} onNewPlan={createPlan} /><main className="management-page"><header className="page-heading"><div><span className="eyebrow">计划中心</span><h1>学习计划</h1><p>统一管理手动创建和标准导入的计划。</p></div><button className="page-primary" onClick={createPlan}>＋ 新建计划</button></header><nav className="management-tabs"><button className={status === 'all' ? 'active' : ''} onClick={() => setStatus('all')}>全部 {projects.length}</button><button className={status === 'active' ? 'active' : ''} onClick={() => setStatus('active')}>进行中 {projects.filter((item) => item.progress < 100).length}</button><button className={status === 'done' ? 'active' : ''} onClick={() => setStatus('done')}>已完成 {projects.filter((item) => item.progress === 100).length}</button></nav><section className="plan-table"><div className="plan-table-head"><span>计划与学生</span><span>进度</span><span>目标日期</span><span>本周状态</span></div>{visible.map((plan) => <article key={plan.id}><div><span className="project-avatar" style={{ background: plan.color }}>{plan.name.at(0)}</span><span><strong>{plan.title}</strong><small>{plan.name} · {plan.course}</small></span></div><div className="table-progress"><span>{plan.progress}%</span><div className="bar"><i style={{ width: `${plan.progress}%` }} /></div></div><time>{plan.deadline || '2026-12-31'}</time><span className={plan.attention ? 'status-chip attention' : 'status-chip'}>{plan.attention ? '需要关注' : '按计划推进'}</span></article>)}{visible.length === 0 && <div className="management-empty"><Inbox /><strong>没有匹配的计划</strong><span>更换搜索词或状态筛选</span></div>}</section></main></>;
}

function DemoGoalsWorkspace() {
  const projects = readStored<StudentProject[]>(PROJECTS_KEY, initialProjects);
  const [expanded, setExpanded] = useState(projects[0]?.id || '');
  const overall = projects.length ? Math.round(projects.reduce((sum, item) => sum + item.progress, 0) / projects.length) : 0;
  return <><Topbar title="目标管理" /><main className="management-page"><header className="page-heading"><div><span className="eyebrow">目标地图</span><h1>从长期目标到每日行动</h1><p>计划、阶段和任务使用同一套目标层级。</p></div><div className="overall-progress"><strong>{overall}%</strong><span>整体完成率</span></div></header><section className="goal-overview"><div><strong>{projects.length}</strong><span>长期目标</span></div><div><strong>{projects.length * 3}</strong><span>阶段里程碑</span></div><div><strong>{projects.length * 8}</strong><span>执行任务</span></div><div><strong>{projects.filter((item) => item.attention).length}</strong><span>待关注目标</span></div></section><section className="desktop-goal-tree">{projects.map((goal, index) => <article key={goal.id}><button className="goal-root" onClick={() => setExpanded(expanded === goal.id ? '' : goal.id)}><span className="goal-index">{String(index + 1).padStart(2, '0')}</span><span><small>长期目标 · {goal.name}</small><strong>{goal.title}</strong></span><div className="table-progress"><span>{goal.progress}%</span><div className="bar"><i style={{ width: `${goal.progress}%` }} /></div></div><ChevronRight className={expanded === goal.id ? 'rotated' : ''} /></button>{expanded === goal.id && <div className="goal-branches"><div><span>阶段 1</span><strong>基础建立</strong><small>完成核心知识与执行习惯</small><b>{Math.min(100, goal.progress + 14)}%</b></div><div><span>阶段 2</span><strong>专项强化</strong><small>按弱项拆分训练任务</small><b>{goal.progress}%</b></div><div><span>阶段 3</span><strong>成果与复盘</strong><small>提交成果并调整下一周期</small><b>{Math.max(0, goal.progress - 28)}%</b></div></div>}</article>)}</section></main></>;
}

type FeedbackFilter = 'all' | 'published' | 'revision';

function FeedbackWorkspace({ openReview }: { openReview: () => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FeedbackFilter>('all');
  const [selectedId, setSelectedId] = useState(assignments[0].id);
  const reviews = readStored<Record<string, SavedReview>>(REVIEWS_KEY, {});
  const visible = assignments.filter((item) => {
    const review = reviews[item.id];
    const matchesQuery = !query.trim() || `${item.student} ${item.title} ${item.subject}`.toLocaleLowerCase('zh-CN').includes(query.trim().toLocaleLowerCase('zh-CN'));
    const matchesFilter = filter === 'all' || (filter === 'published' ? review?.published : review?.needsRevision || review?.status === 'revision');
    return matchesQuery && matchesFilter;
  });
  const selected = assignments.find((item) => item.id === selectedId) || visible[0] || assignments[0];
  const review = reviews[selected.id];
  const publishedCount = assignments.filter((item) => reviews[item.id]?.published).length;
  const revisionCount = assignments.filter((item) => reviews[item.id]?.needsRevision || reviews[item.id]?.status === 'revision').length;
  return <><Topbar title="反馈中心" query={query} onQueryChange={setQuery} /><main className="management-page"><header className="page-heading"><div><span className="eyebrow">学习反馈</span><h1>反馈中心</h1><p>集中查看已发布评语、订正要求与学生成果。</p></div><button className="page-primary" onClick={openReview}>进入作业批改</button></header><section className="feedback-summary"><div><strong>{publishedCount}</strong><span>已发布反馈</span></div><div><strong>{revisionCount}</strong><span>待订正</span></div><div><strong>{assignments.length - publishedCount}</strong><span>待处理</span></div></section><nav className="management-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>全部 {assignments.length}</button><button className={filter === 'published' ? 'active' : ''} onClick={() => setFilter('published')}>已发布 {publishedCount}</button><button className={filter === 'revision' ? 'active' : ''} onClick={() => setFilter('revision')}>需订正 {revisionCount}</button></nav><section className="feedback-workspace"><div className="feedback-list">{visible.map((item) => { const saved = reviews[item.id]; return <button className={selected.id === item.id ? 'selected' : ''} key={item.id} onClick={() => setSelectedId(item.id)}><span className="project-avatar">{item.student.at(0)}</span><span><strong>{item.student}</strong><small>{item.title}</small></span><b className={saved?.needsRevision ? 'revision' : ''}>{saved?.published ? (saved.needsRevision ? '需订正' : '已发布') : '待处理'}</b></button>; })}{visible.length === 0 && <div className="management-empty"><Inbox /><strong>没有匹配的反馈</strong><span>更换搜索词或状态筛选</span></div>}</div><article className="feedback-detail"><header><div><span className="eyebrow">{selected.subject}</span><h2>{selected.student}</h2><p>{selected.title}</p></div><span className={review?.needsRevision ? 'status-chip attention' : 'status-chip'}>{review?.published ? (review.needsRevision ? '需要订正' : '反馈已发布') : '等待批改'}</span></header><div className="feedback-score"><strong>{review?.score || '--'}</strong><span>本次得分 / 100</span></div><section><span className="eyebrow">教师评语</span><p>{review?.comment || '完成批改并发布后，教师评语会显示在这里。'}</p></section><section><span className="eyebrow">页内批注</span><p>{review?.annotation || '暂无页内批注。'}</p></section><footer><span>{selected.submittedAt} · {selected.files.length} 个附件</span><button onClick={openReview}>打开批改工作区</button></footer></article></section></main></>;
}

type TeacherSettings = { displayName: string; subjects: string; reminder: boolean; weeklyReport: boolean; reviewDigest: boolean };
const defaultTeacherSettings: TeacherSettings = { displayName: '秦老师', subjects: '数学 · 英语', reminder: true, weeklyReport: true, reviewDigest: false };

function SettingsWorkspace() {
  const [settings, setSettings] = useState(() => readStored<TeacherSettings>(SETTINGS_KEY, defaultTeacherSettings));
  const [saved, setSaved] = useState(false);
  const [section, setSection] = useState<'profile' | 'notifications' | 'security'>('profile');
  const update = <K extends keyof TeacherSettings>(key: K, value: TeacherSettings[K]) => { setSettings((current) => ({ ...current, [key]: value })); setSaved(false); };
  const save = () => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); setSaved(true); };
  return <><Topbar title="设置" /><main className="management-page settings-page"><header className="page-heading"><div><span className="eyebrow">工作空间设置</span><h1>教师偏好</h1><p>管理本地原型中的教师资料、提醒和报告偏好。</p></div><button className="page-primary" onClick={save}>保存设置</button></header><section className="settings-layout"><div className="settings-nav" aria-label="设置分类"><button className={section === 'profile' ? 'active' : ''} onClick={() => setSection('profile')}>个人资料</button><button className={section === 'notifications' ? 'active' : ''} onClick={() => setSection('notifications')}>通知偏好</button><button className={section === 'security' ? 'active' : ''} onClick={() => setSection('security')}>数据与安全</button></div><div className="settings-content">{section === 'profile' && <section><header><h2>个人资料</h2><p>用于教师工作台和学生端反馈署名。</p></header><label>显示名称<input value={settings.displayName} onChange={(event) => update('displayName', event.target.value)} /></label><label>授课方向<input value={settings.subjects} onChange={(event) => update('subjects', event.target.value)} /></label></section>}{section === 'notifications' && <section><header><h2>通知偏好</h2><p>生产通知服务接入前，这些选项仅保存在当前浏览器。</p></header><label className="setting-toggle"><span><strong>每日任务提醒</strong><small>提醒当天仍未处理的任务</small></span><input type="checkbox" checked={settings.reminder} onChange={(event) => update('reminder', event.target.checked)} /></label><label className="setting-toggle"><span><strong>每周学习报告</strong><small>汇总完成率、评分和调整建议</small></span><input type="checkbox" checked={settings.weeklyReport} onChange={(event) => update('weeklyReport', event.target.checked)} /></label><label className="setting-toggle"><span><strong>批改摘要</strong><small>集中提醒新增提交与订正作业</small></span><input type="checkbox" checked={settings.reviewDigest} onChange={(event) => update('reviewDigest', event.target.checked)} /></label></section>}{section === 'security' && <section><header><h2>数据与安全</h2><p>账户、权限和云端同步将在生产后端接入后统一管理。</p></header><div className="settings-note"><Check />当前没有向第三方 AI 服务发送计划或学生数据。</div></section>}</div></section></main>{saved && <div className="action-toast" role="status"><Check />设置已保存在本地</div>}</>;
}

export function App({ identity, onSignOut }: { identity?: SignedInIdentity; onSignOut?: () => Promise<void> } = {}) {
  const [view, setView] = useState<View>(identity ? 'students' : 'dashboard');
  const [dashboardCreate, setDashboardCreate] = useState(false);
  const navigate = (next: View) => { setDashboardCreate(false); setView(next); };
  const renderView = () => {
    if (view === 'dashboard') return <TeacherDashboard key={dashboardCreate ? 'create' : 'default'} createOnOpen={dashboardCreate} openReview={() => navigate('review')} />;
    if (view === 'students') return identity ? <TeacherProgressWorkspace identity={identity} mode="students" /> : <main className="teacher-live-loading"><strong>请先登录教师账号</strong></main>;
    if (view === 'plans') return <PlansWorkspace createPlan={() => { setDashboardCreate(true); setView('dashboard'); }} />;
    if (view === 'goals') return identity ? <TeacherProgressWorkspace identity={identity} mode="goals" /> : <main className="teacher-live-loading"><strong>请先登录教师账号</strong></main>;
    if (view === 'feedback') return <FeedbackWorkspace openReview={() => setView('review')} />;
    if (view === 'settings') return <SettingsWorkspace />;
    return <ReviewWorkspace close={() => setView('dashboard')} />;
  };
  return <div className="app-shell"><Sidebar view={view} setView={navigate} identity={identity} onSignOut={onSignOut} /><div className="workspace"><div className="view-transition" key={view}>{renderView()}</div></div></div>;
}
