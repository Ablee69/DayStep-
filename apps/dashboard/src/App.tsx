import { useMemo, useState } from 'react';
import {
  ArrowUpRight, Bell, BookOpenCheck, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardCheck, Download, Inbox, LayoutDashboard, MessageSquareText, MoreHorizontal,
  PanelLeftClose, Search, Send, Settings, Sparkles, Upload, Users, X,
} from 'lucide-react';
import type { Assignment } from '@daystep/domain';

type View = 'dashboard' | 'review';
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

function Sidebar({ view, setView }: { view: View; setView: (view: View) => void }) {
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark">D</span><span>DayStep</span></div>
    <nav aria-label="主要导航">
      <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}><LayoutDashboard />总览</button>
      <button disabled title="下一阶段开放"><Users />学生</button><button disabled title="下一阶段开放"><CalendarDays />计划</button><button disabled title="下一阶段开放"><BookOpenCheck />目标</button>
      <button className={view === 'review' ? 'active' : ''} onClick={() => setView('review')}><ClipboardCheck />作业批改<span className="nav-count">3</span></button>
      <button disabled title="下一阶段开放"><MessageSquareText />反馈</button>
    </nav>
    <div className="sidebar-bottom"><button disabled title="下一阶段开放"><Settings />设置</button><div className="teacher"><span>秦</span><div><strong>秦老师</strong><small>数学 · 英语</small></div><MoreHorizontal /></div></div>
  </aside>;
}

function Topbar({ title, query = '', onQueryChange, onNewPlan, onNotifications }: { title: string; query?: string; onQueryChange?: (value: string) => void; onNewPlan?: () => void; onNotifications?: () => void }) {
  return <header className="topbar" aria-label={title}><button className="icon-button mobile-menu" aria-label="收起侧栏"><PanelLeftClose /></button><label className="search"><Search /><input aria-label="搜索学生、目标或作业" placeholder="搜索学生、目标或作业" value={query} onChange={(event) => onQueryChange?.(event.target.value)} /></label><div className="topbar-actions"><button className="icon-button" aria-label="通知" onClick={onNotifications}><Bell /><i /></button><button className="new-plan" onClick={onNewPlan}><Sparkles />新建计划</button><span className="topbar-avatar">秦</span></div></header>;
}

function DashboardDialog({ panel, studentName, close, savePlan }: { panel: Exclude<DashboardPanel, null>; studentName?: string; close: () => void; savePlan: (student: string, title: string, deadline: string) => void }) {
  const [planStudent, setPlanStudent] = useState('林晓晴');
  const [planTitle, setPlanTitle] = useState('阶段学习计划');
  const [deadline, setDeadline] = useState('2026-12-31');
  const content = {
    'new-plan': { eyebrow: '计划设置', title: '新建学习计划', body: <><label>选择学生<select value={planStudent} onChange={(event) => setPlanStudent(event.target.value)}>{students.map((student) => <option key={student.name}>{student.name}</option>)}</select></label><label>计划名称<input value={planTitle} onChange={(event) => setPlanTitle(event.target.value)} /></label><label>目标日期<input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label></> },
    students: { eyebrow: '学生管理', title: '当前学生', body: <div className="dialog-students">{students.map((student) => <div key={student.name}><span className="project-avatar" style={{ background: student.color }}>{student.name.at(0)}</span><span><strong>{student.name}</strong><small>{student.course}</small></span><b>{student.progress}%</b></div>)}</div> },
    insight: { eyebrow: '智能建议', title: '本周重点关注', body: <div className="insight-copy"><strong>陈子轩的托福计划进度偏慢</strong><p>本周完成率为 64%，建议优先检查阅读任务的时间安排，并在周五复盘时调整下周任务量。</p></div> },
    student: { eyebrow: '学生概览', title: studentName || '学生项目', body: <div className="insight-copy"><strong>本周学习状态稳定</strong><p>已完成 5 项任务，当前有 1 份作业待批改。最近一次打卡为今天 09:42。</p></div> },
    notifications: { eyebrow: '通知', title: '最新动态', body: <div className="dialog-students"><div><span className="project-avatar">林</span><span><strong>林晓晴提交了新作业</strong><small>今天 09:42</small></span></div><div><span className="project-avatar">陈</span><span><strong>陈子轩完成今日任务</strong><small>今天 08:15</small></span></div></div> },
  }[panel];
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="dashboard-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button className="icon-button dialog-close" aria-label="关闭" onClick={close}><X /></button><span className="eyebrow">{content.eyebrow}</span><h2 id="dialog-title">{content.title}</h2><div className="dialog-body">{content.body}</div><div className="dialog-actions"><button className="ghost-button" onClick={close}>取消</button>{panel === 'new-plan' && <button className="publish" disabled={!planTitle.trim()} onClick={() => savePlan(planStudent, planTitle.trim(), deadline)}>保存计划</button>}</div></section></div>;
}

function TeacherDashboard({ openReview }: { openReview: () => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StudentFilter>('all');
  const [panel, setPanel] = useState<DashboardPanel>(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [monthOffset, setMonthOffset] = useState(0);
  const [projects, setProjects] = useState(initialProjects);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [toast, setToast] = useState('');
  const visibleStudents = useMemo(() => filterStudents(query, filter, projects), [query, filter, projects]);
  const savePlan = (studentName: string, title: string, deadline: string) => {
    const student = students.find((item) => item.name === studentName) || students[0];
    setProjects((current) => [...current, { ...student, id: `project-${Date.now()}`, title, deadline, progress: 0, score: 0 }]);
    setPanel(null);
    setFilter('all');
    setToast(`已为${studentName}创建“${title}”`);
    window.setTimeout(() => setToast(''), 2600);
  };
  const previewState = new URLSearchParams(window.location.search).get('state');
  return <><Topbar title="下午好，秦老师" query={query} onQueryChange={setQuery} onNewPlan={() => setPanel('new-plan')} onNotifications={() => setPanel('notifications')} /><main className="dashboard-grid">
    <section className="workspace-heading"><div><span className="eyebrow">教师工作空间</span><h1>学生项目</h1></div><div className="heading-tools"><button className="icon-button" aria-label="智能建议" onClick={() => setPanel('insight')}><Sparkles /></button><button className="ghost-button" onClick={() => setPanel('students')}>管理学生</button></div><nav className="project-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>全部目标 <b>{projects.length}</b></button><button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>进行中 <b>{projects.filter((item) => item.progress < 100).length}</b></button><button className={filter === 'attention' ? 'active' : ''} onClick={() => setFilter('attention')}>待关注 <b>{projects.filter((item) => item.attention).length}</b></button><button onClick={openReview}>待批改 <b>3</b></button></nav></section>
    <section className="student-projects" aria-label="学生项目列表">{previewState === 'loading' ? <div className="project-state loading-state"><span /><span /><span /></div> : previewState === 'error' ? <div className="project-state"><Inbox /><strong>暂时无法载入项目</strong><small>请检查网络后重新加载页面</small><button onClick={() => window.location.reload()}>重新加载</button></div> : previewState === 'empty' || visibleStudents.length === 0 ? <div className="project-state"><Search /><strong>没有找到匹配的项目</strong><small>试试其他学生姓名、课程或筛选条件</small>{query && <button onClick={() => setQuery('')}>清除搜索</button>}</div> : visibleStudents.map((student, index) => <button className={`student-project ${index === 0 ? 'featured' : ''}`} key={student.id} onClick={() => { setSelectedStudent(student.name); setPanel('student'); }}><div className="project-card-top"><span className="project-avatar" style={{ background: student.color }}>{student.name.at(0)}</span><span className="project-more">•••</span></div><span className="project-course">{student.course}</span><strong>{student.title}</strong><div className="project-progress"><span>{student.progress}%</span><div className="bar"><i style={{ width: `${student.progress}%` }} /></div></div><small>本周得分 {student.score} · 今天有 3 项任务</small><ArrowUpRight /></button>)}</section>
    <section className="statistics"><div className="section-heading"><div><span className="eyebrow">学习统计</span><h2>{period === 'week' ? '本周完成趋势' : '本月完成趋势'}</h2></div><select aria-label="统计周期" value={period} onChange={(event) => setPeriod(event.target.value as 'week' | 'month')}><option value="week">本周</option><option value="month">本月</option></select></div><div className="chart-legend"><span><i className="current" />{period === 'week' ? '本周' : '本月'}</span><span><i />{period === 'week' ? '上周' : '上月'}</span></div><div className="line-chart" role="img" aria-label="本周与上周完成趋势折线图"><div className="grid-lines"><i /><i /><i /><i /></div><svg viewBox="0 0 700 230" preserveAspectRatio="none"><polyline className="previous-line" points="0,202 80,154 160,172 240,88 320,140 400,92 480,120 560,44 640,88 700,28"/><polyline className="current-line" points={period === 'week' ? '0,210 80,178 160,102 240,136 320,72 400,82 480,36 560,118 640,52 700,16' : '0,198 80,160 160,146 240,110 320,132 400,74 480,90 560,42 640,64 700,24'}/><circle cx="560" cy="118" r="7" /></svg><div className="chart-axis">{(period === 'week' ? ['一','二','三','四','五','六','日'] : ['1周','2周','3周','4周','5周']).map((day) => <span key={day}>{day}</span>)}</div></div></section>
    <section className="today-panel"><div className="today-heading"><div><span className="eyebrow">2026 年 {10 + monthOffset} 月</span><h2>今天</h2></div><div className="calendar-nav"><button aria-label="上个月" onClick={() => setMonthOffset(monthOffset - 1)}><ChevronLeft /></button><button aria-label="下个月" onClick={() => setMonthOffset(monthOffset + 1)}><ChevronRight /></button></div></div><div className="month-grid">{['日','一','二','三','四','五','六','4','5','6','7','8','9','10','11','12','13','14','15','16','17'].map((day, index) => <span className={day === '10' ? 'selected' : index < 7 ? 'weekday' : ''} key={`${day}-${index}`}>{day}</span>)}</div><button className="today-task" onClick={openReview}><span className="task-time-large">14:00</span><strong>林晓晴 · 计划复盘</strong><small>检查阶段进度与待批改作业</small><span className="task-people"><i>林</i><i>秦</i></span><Check /></button></section>
  </main>{panel && <DashboardDialog panel={panel} studentName={selectedStudent} close={() => setPanel(null)} savePlan={savePlan} />}{toast && <div className="action-toast" role="status"><Check />{toast}</div>}</>;
}

function ReviewWorkspace({ close }: { close: () => void }) {
  const [selectedId, setSelectedId] = useState('a1');
  const [score, setScore] = useState('88');
  const [comment, setComment] = useState('思路完整，组合数计算正确。第 4 题请补充事件互斥的判断依据。');
  const [published, setPublished] = useState(false);
  const [tool, setTool] = useState<'批注' | '高亮' | '文字'>('批注');
  const [status, setStatus] = useState('graded');
  const [needsRevision, setNeedsRevision] = useState(false);
  const [feedbackFile, setFeedbackFile] = useState('');
  const selected = useMemo(() => assignments.find((item) => item.id === selectedId)!, [selectedId]);
  const scoreInvalid = !isValidScore(score);
  return <><Topbar title="作业批改" /><main className="review-layout">
    <aside className="review-queue"><div className="queue-title"><div><span className="eyebrow">批改队列</span><h2>待处理 3</h2></div><button className="icon-button"><ChevronDown /></button></div>{assignments.map((item) => <button className={`queue-item ${selected.id === item.id ? 'selected' : ''}`} key={item.id} onClick={() => { setSelectedId(item.id); setPublished(false); }}><span className="avatar">{item.student.at(0)}</span><span><strong>{item.student}</strong><small>{item.title}</small><time>{item.submittedAt}</time></span></button>)}</aside>
    <section className="document-viewer"><div className="document-toolbar"><div><button className="icon-button" aria-label="返回总览" onClick={close}><ChevronLeft /></button><strong>{selected.title}</strong></div><div>{(['批注','高亮','文字'] as const).map((name) => <button className={tool === name ? 'tool active' : 'tool'} key={name} onClick={() => setTool(name)}>{name}</button>)}<button className="icon-button" aria-label="下载原文件" disabled title="真实文件接入后开放"><Download /></button></div></div><div className="paper"><div className="paper-heading"><span>{selected.subject}</span><h2>{selected.title}</h2><p>姓名：{selected.student}　日期：2026-10-10</p></div><ol><li>袋中有 4 个红球、3 个白球，任取两个球，求颜色相同的概率。<div className="answer">C(4,2) + C(3,2) / C(7,2) = 9 / 21 = 3 / 7</div><span className="mark correct"><Check />正确</span></li><li>甲、乙两事件互斥，P(A)=0.3，P(B)=0.4，求 P(A∪B)。<div className="answer">P(A∪B) = 0.3 + 0.4 = 0.7</div><span className="annotation">请写出“互斥事件”条件为何允许直接相加。</span></li><li>完成树状图并列出所有可能结果。<div className="tree-placeholder">学生作答图像 · 第 2 页</div></li></ol></div><div className="page-counter">第 1 页 / 共 {selected.files.length} 页</div></section>
    <aside className="feedback-panel"><div className="student-header"><span className="avatar">{selected.student.at(0)}</span><div><strong>{selected.student}</strong><small>{selected.subject}</small></div><button className="icon-button" aria-label="关闭批改" onClick={close}><X /></button></div><div className="meta"><span>提交时间</span><strong>{selected.submittedAt}</strong><span>附件</span><strong>{selected.files.length} 个文件</strong></div><label>得分<div className="score-input"><input className={scoreInvalid ? 'invalid' : ''} value={score} onChange={(event) => { setScore(event.target.value); setPublished(false); }} inputMode="numeric" /><span>/ 100</span></div>{scoreInvalid && <small className="field-error">请输入 0–100 的分数</small>}</label><label>批改状态<select value={status} onChange={(event) => { setStatus(event.target.value); setPublished(false); }}><option value="reviewing">批改中</option><option value="graded">已批改</option><option value="revision">需订正</option></select></label><label>教师评语<textarea value={comment} onChange={(event) => { setComment(event.target.value); setPublished(false); }} /></label><label className="check-row"><input type="checkbox" checked={needsRevision} onChange={(event) => { setNeedsRevision(event.target.checked); setStatus(event.target.checked ? 'revision' : 'graded'); setPublished(false); }} />需要学生订正后重交</label><button className={feedbackFile ? 'upload-feedback uploaded' : 'upload-feedback'} onClick={() => setFeedbackFile('批改反馈.pdf')}><Upload />{feedbackFile || '上传批改文件'}</button>{published ? <div className="published"><Check />反馈已发布给学生</div> : <button className="publish" disabled={scoreInvalid || !comment.trim()} onClick={() => setPublished(true)}><Send />发布评分与反馈</button>}</aside>
  </main></>;
}

export function App() {
  const [view, setView] = useState<View>('dashboard');
  return <div className="app-shell"><Sidebar view={view} setView={setView} /><div className="workspace">{view === 'dashboard' ? <TeacherDashboard openReview={() => setView('review')} /> : <ReviewWorkspace close={() => setView('dashboard')} />}</div></div>;
}
