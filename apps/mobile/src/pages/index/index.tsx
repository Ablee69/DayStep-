import { useMemo, useState } from 'react';
import { Button, Input, Picker, ScrollView, Switch, Text, Textarea, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import type { DayStepPlanV1, GoalNode, Step, Task } from '@daystep/domain';
import { calculateTaskProgress, parseJsonPlan, parseMarkdownPlan, scheduleUndatedTasks, validatePlan } from '@daystep/domain';
import { ADJUSTMENT_STORAGE_KEY, calculateTaskInsights, createDataExport, DRAFT_STORAGE_KEY, PROFILE_STORAGE_KEY, restorePlanDraft, restoreProfile, restoreTasks, TASKS_STORAGE_KEY, type PlanDraft, type ProfilePreferences } from './storage';
import './index.scss';
import './history.scss';

type Screen = 'today' | 'map' | 'task' | 'create' | 'import' | 'stats' | 'profile' | 'feedback' | 'history';

const initialTasks: Task[] = [
  { id: 'reading', title: '托福阅读精练', goal: '托福 100 分', project: '阅读能力强化', duration: 45, dueTime: '10:30', priority: 'high', progress: 67, status: 'active', steps: [
    { id: 'r1', title: '完成 TPO 54 Passage 1', completed: true, minutes: 20 },
    { id: 'r2', title: '整理 5 个生词', completed: true, minutes: 10 },
    { id: 'r3', title: '分析两道错题', completed: false, minutes: 15 },
  ] },
  { id: 'workout', title: '上肢力量训练', goal: '每周健身 4 次', project: '力量与体能', duration: 35, dueTime: '18:30', priority: 'medium', progress: 0, status: 'todo', steps: [
    { id: 'w1', title: '热身与肩部激活', completed: false, minutes: 8 },
    { id: 'w2', title: '俯卧撑 4 × 12', completed: false, minutes: 12 },
    { id: 'w3', title: '哑铃划船 4 × 10', completed: false, minutes: 15 },
  ] },
  { id: 'course', title: '概率论课程复习', goal: '完成大学课程', project: '期中考试准备', duration: 50, dueTime: '20:00', priority: 'medium', progress: 25, status: 'active', steps: [
    { id: 'c1', title: '复习条件概率笔记', completed: true, minutes: 15 },
    { id: 'c2', title: '完成课后练习 1-6', completed: false, minutes: 25 },
    { id: 'c3', title: '记录疑问', completed: false, minutes: 10 },
    { id: 'c4', title: '上传练习成果', completed: false },
  ] },
];

function loadTasks() {
  try { return restoreTasks(Taro.getStorageSync(TASKS_STORAGE_KEY), initialTasks); } catch { return initialTasks; }
}

function loadPlanDraft() {
  try { return restorePlanDraft(Taro.getStorageSync(DRAFT_STORAGE_KEY)); } catch { return null; }
}

function taskStorageKey(taskId: string, field: 'note' | 'attachment') {
  return `daystep.task.${taskId}.${field}`;
}

function saveLocal(key: string, value: unknown) {
  try { Taro.setStorageSync(key, value); return true; }
  catch { Taro.showToast({ title: '本机存储空间不足，修改尚未保存', icon: 'none' }); return false; }
}

const goalTree: GoalNode = { id: 'g1', title: '托福 100 分', kind: 'goal', progress: 42, children: [
  { id: 'm1', title: '阶段一 · 基础能力重建', kind: 'milestone', progress: 72, children: [
    { id: 'p1', title: '阅读能力强化', kind: 'project', progress: 68, children: [
      { id: 't1', title: 'TPO 54 阅读精练', kind: 'task', progress: 67 },
      { id: 't2', title: '核心词汇复习', kind: 'task', progress: 100 },
    ] },
    { id: 'p2', title: '听力结构训练', kind: 'project', progress: 54 },
  ] },
  { id: 'm2', title: '阶段二 · 专项突破', kind: 'milestone', progress: 18 },
  { id: 'm3', title: '阶段三 · 模考冲刺', kind: 'milestone', progress: 0 },
] };

const today = new Date();
const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
const dates = Array.from({ length: 7 }, (_, index) => { const date = new Date(monday); date.setDate(monday.getDate() + index); return { d: ['一','二','三','四','五','六','日'][index], n: date.getDate(), active: date.toDateString() === today.toDateString() }; });

function Header({ title, back, action }: { title: string; back?: () => void; action?: string }) {
  return <View className="screen-header">{back ? <Button className="round-icon" onClick={back}>‹</Button> : <View className="profile">D</View>}<View className="header-copy"><Text className="overline">SMALL STEPS, BIG PROGRESS</Text><Text className="header-title">{title}</Text></View>{action ? <Button className="round-icon" disabled>{action}</Button> : <View className="round-icon quiet">•</View>}</View>;
}

function ProgressBar({ value }: { value: number }) { return <View className="progress-track"><View className="progress-fill" style={{ width: `${value}%` }} /></View>; }

function Today({ tasks, openTask, openCreate }: { tasks: Task[]; openTask: (task: Task) => void; openCreate: () => void }) {
  const visibleTasks = tasks.filter((task) => !task.scheduledDate || task.scheduledDate === todayIso);
  const complete = visibleTasks.length ? Math.round(visibleTasks.reduce((sum, task) => sum + task.progress, 0) / visibleTasks.length) : 0;
  const totalMinutes = visibleTasks.reduce((sum, task) => sum + task.duration, 0);
  const durationLabel = totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)} 小时${totalMinutes % 60 ? ` ${totalMinutes % 60} 分` : ''}` : `${totalMinutes} 分钟`;
  const dateLabel = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(today);
  return <><Header title="早上好，Matthew" action="⌁" /><ScrollView scrollY className="screen-scroll"><View className="date-strip">{dates.map((date) => <View className={date.active ? 'date active' : 'date'} key={`${date.d}-${date.n}`}><Text>{date.d}</Text><Text>{date.n}</Text></View>)}</View><View className="daily-hero"><View><Text className="overline">{dateLabel}</Text><Text className="hero-title">今天，向前一步。</Text><Text className="hero-sub">{visibleTasks.length} 项任务 · 预计 {durationLabel}</Text></View><View className="mini-ring"><Text>{complete}%</Text></View></View><View className="section-row"><View><Text className="section-label">今日计划</Text><Text className="section-title">你的任务</Text></View><Button className="add-button" onClick={openCreate}>＋</Button></View><View className="task-list">{visibleTasks.map((task) => <Button className="task-card" key={task.id} onClick={() => openTask(task)}><View className={`task-icon ${task.id}`}><Text>{task.id === 'reading' ? '阅' : task.id === 'workout' ? '练' : '学'}</Text></View><View className="task-copy"><View className="task-top"><Text>{task.title}</Text><Text className="task-time">{task.dueTime}</Text></View><Text className="task-meta">{task.goal} · {task.duration} 分钟</Text><View className="task-progress"><ProgressBar value={task.progress} /><Text>{task.progress}%</Text></View></View><View className={task.progress === 100 ? 'task-check done' : 'task-check'}>{task.progress === 100 ? '✓' : ''}</View></Button>)}</View><View className="reflection"><Text className="overline">今日提示</Text><Text className="reflection-title">先完成最小的一步，再决定下一步。</Text><Text>你已经连续打卡 8 天。</Text></View></ScrollView></>;
}

function TreeNode({ node, level = 0, openTask }: { node: GoalNode; level?: number; openTask: () => void }) {
  const [expanded, setExpanded] = useState(level < 2);
  return <View className={`tree-wrap level-${level}`}><Button className={`tree-node ${node.kind}`} onClick={() => node.kind === 'task' ? openTask() : setExpanded(!expanded)}><View className="tree-symbol">{node.kind === 'goal' ? '◎' : node.kind === 'milestone' ? '◇' : node.kind === 'project' ? '▦' : '✓'}</View><View className="tree-copy"><Text className="tree-kind">{node.kind === 'goal' ? '长期目标' : node.kind === 'milestone' ? '阶段里程碑' : node.kind === 'project' ? '子项目' : '任务'}</Text><Text className="tree-title">{node.title}</Text><ProgressBar value={node.progress} /></View><Text className="tree-percent">{node.progress}%</Text><Text className="chevron">{node.children ? (expanded ? '⌃' : '⌄') : '›'}</Text></Button>{expanded && node.children?.map((child) => <TreeNode node={child} level={level + 1} key={child.id} openTask={openTask} />)}</View>;
}

function GoalMap({ draft, openDraft, openTask }: { draft: PlanDraft | null; openDraft: () => void; openTask: () => void }) { return <><Header title="目标地图" action="⋯" /><ScrollView scrollY className="screen-scroll"><View className="goal-summary"><Text className="overline">当前主目标</Text><Text className="goal-name">托福 100 分</Text><Text className="goal-deadline">目标日期 · 2027 年 1 月 18 日</Text><View className="goal-progress-row"><ProgressBar value={42} /><Text>42%</Text></View><View className="goal-stats"><View><Text>3</Text><Text>阶段</Text></View><View><Text>7</Text><Text>项目</Text></View><View><Text>24</Text><Text>任务</Text></View><View><Text>9</Text><Text>已完成</Text></View></View></View>{draft && <View className="saved-draft"><View><Text className="overline">本地计划草稿</Text><Text className="saved-draft-title">{draft.goal}</Text><Text className="saved-draft-meta">目标日期 {draft.deadline} · 每天 {draft.minutes} 分钟</Text></View><Button onClick={openDraft}>继续编辑</Button></View>}<View className="section-row"><View><Text className="section-label">从目标到行动</Text><Text className="section-title">计划结构</Text></View><Text className="muted">点击展开</Text></View><View className="goal-tree"><TreeNode node={goalTree} openTask={openTask} /></View><View className="next-action"><Text className="overline">下一步行动</Text><Text>TPO 54 阅读精练</Text><Button onClick={openTask}>开始任务 →</Button></View></ScrollView></>;
}

function TaskDetail({ task, updateTask, back }: { task: Task; updateTask: (task: Task) => void; back: () => void }) {
  const [note, setNote] = useState(() => { try { return Taro.getStorageSync(taskStorageKey(task.id, 'note')) || ''; } catch { return ''; } });
  const [attachment, setAttachment] = useState(() => { try { return Taro.getStorageSync(taskStorageKey(task.id, 'attachment')) || ''; } catch { return ''; } });
  const [completed, setCompleted] = useState(task.status === 'done');
  const [addingStep, setAddingStep] = useState(false);
  const [stepTitle, setStepTitle] = useState('');
  const [stepMinutes, setStepMinutes] = useState('10');
  const toggleStep = (id: string) => { const steps = task.steps.map((step) => step.id === id ? { ...step, completed: !step.completed } : step); updateTask({ ...task, steps, progress: calculateTaskProgress(steps), status: steps.every((step) => step.completed) ? 'done' : 'active' }); };
  const addStep = () => {
    const title = stepTitle.trim();
    if (!title) return;
    const minutes = Math.max(1, Number.parseInt(stepMinutes, 10) || 10);
    const steps: Step[] = [...task.steps, { id: `step-${Date.now()}`, title, completed: false, minutes }];
    updateTask({ ...task, steps, progress: calculateTaskProgress(steps), status: 'active' });
    setStepTitle(''); setStepMinutes('10'); setAddingStep(false); setCompleted(false);
  };
  const finishTask = () => { updateTask({ ...task, status: 'done', progress: 100 }); setCompleted(true); };
  const updateNote = (value: string) => { setNote(value); saveLocal(taskStorageKey(task.id, 'note'), value); };
  const attachResult = () => { const fileName = '演示成果.pdf'; setAttachment(fileName); saveLocal(taskStorageKey(task.id, 'attachment'), fileName); };
  return <><Header title="任务详情" back={back} action="⋯" /><ScrollView scrollY className="screen-scroll">{completed && <View className="success-banner"><Text>✓</Text><View><Text>任务已完成</Text><Text>今天的进度已经记录</Text></View></View>}<View className="task-detail-hero"><View className="pill">{completed ? '已完成' : '进行中'}</View><Text className="detail-title">{task.title}</Text><Text className="detail-path">{task.goal}　›　{task.project}</Text><View className="detail-progress"><View className="large-progress"><ProgressBar value={task.progress} /></View><Text>{task.progress}%</Text></View><View className="detail-meta"><View><Text>预计耗时</Text><Text>{task.duration} 分钟</Text></View><View><Text>截止时间</Text><Text>今天 {task.dueTime}</Text></View><View><Text>优先级</Text><Text>{task.priority === 'high' ? '高' : '中'}</Text></View></View></View><View className="section-row"><View><Text className="section-label">执行清单</Text><Text className="section-title">{task.steps.filter((step) => step.completed).length} / {task.steps.length} 个步骤</Text></View><Button className="small-button" onClick={() => setAddingStep(true)}>＋ 添加</Button></View>{addingStep && <View className="step-composer"><Text className="field-label">步骤名称</Text><Input value={stepTitle} focus onInput={(event) => setStepTitle(event.detail.value)} placeholder="例如：整理本次练习的错题" maxlength={80} /><Text className="field-label">预计时长</Text><View className="composer-minutes"><Input type="number" value={stepMinutes} onInput={(event) => setStepMinutes(event.detail.value)} /><Text>分钟</Text></View><View className="composer-actions"><Button onClick={() => { setAddingStep(false); setStepTitle(''); }}>取消</Button><Button disabled={!stepTitle.trim()} onClick={addStep}>添加步骤</Button></View></View>}<View className="step-list">{task.steps.map((step, index) => <Button className={step.completed ? 'step-card completed' : 'step-card'} key={step.id} onClick={() => toggleStep(step.id)}><View className="step-number">{step.completed ? '✓' : index + 1}</View><View><Text>{step.title}</Text>{step.minutes ? <Text className="task-meta">约 {step.minutes} 分钟</Text> : null}</View><View className="step-toggle" /></Button>)}</View><View className="detail-section"><Text className="section-title">执行备注</Text><Textarea value={note} onInput={(event) => updateNote(event.detail.value)} placeholder="记录困难、想法或今天的收获…" maxlength={300} /></View><View className="detail-section"><View className="section-row compact"><Text className="section-title">成果提交</Text><Text className="muted">本地演示</Text></View><Button className={attachment ? 'upload-card attached' : 'upload-card'} onClick={attachResult}><Text>{attachment ? '✓' : '＋'}</Text><View><Text>{attachment || '添加演示附件'}</Text><Text>{attachment ? '已保存到本机演示数据' : '第一阶段暂不上传真实文件'}</Text></View></Button></View><Button className="complete-button" disabled={task.progress < 100 || completed} onClick={finishTask}>{completed ? '已完成' : task.progress === 100 ? '完成任务' : `还需完成 ${task.steps.filter((step) => !step.completed).length} 个步骤`}</Button></ScrollView></>;
}

function ImportPlan({ back, openManual, confirm }: { back: () => void; openManual: () => void; confirm: (tasks: Task[]) => void }) {
  const [source, setSource] = useState('');
  const [sourceType, setSourceType] = useState<'markdown' | 'json'>('markdown');
  const [plan, setPlan] = useState<DayStepPlanV1 | null>(null);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('2026-11-01');
  const [dailyMinutes, setDailyMinutes] = useState('90');
  const recognize = () => {
    try { setPlan(sourceType === 'markdown' ? parseMarkdownPlan(source) : parseJsonPlan(source)); setError(''); }
    catch (reason) { setPlan(null); setError(reason instanceof Error ? reason.message : '无法识别计划'); }
  };
  const chooseFile = async () => {
    try {
      const result = await Taro.chooseMessageFile({ count: 1, type: 'file', extension: ['md', 'json'] });
      const file = result.tempFiles[0];
      const text = await new Promise<string>((resolve, reject) => Taro.getFileSystemManager().readFile({ filePath: file.path, encoding: 'utf8', success: (value) => resolve(String(value.data)), fail: reject }));
      setSource(text); setSourceType(file.name.toLowerCase().endsWith('.json') ? 'json' : 'markdown'); setPlan(null); setError('');
    } catch { setError('当前环境未能读取文件，请改为粘贴 Markdown 或 JSON 内容'); }
  };
  const updateGoal = (title: string) => setPlan((current) => current ? { ...current, goal: { ...current.goal, title }, issues: validatePlan({ ...current, goal: { ...current.goal, title } }) } : current);
  const updateTaskTitle = (milestoneIndex: number, projectIndex: number, taskIndex: number, title: string) => setPlan((current) => {
    if (!current) return current;
    const next = structuredClone(current); next.milestones[milestoneIndex].projects[projectIndex].tasks[taskIndex].title = title; next.issues = validatePlan(next); return next;
  });
  const arrange = () => {
    if (!plan) return;
    try { const next = structuredClone(plan); setPlan(scheduleUndatedTasks(next, startDate, Number(dailyMinutes)).plan); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '无法生成排程草案'); }
  };
  const finish = () => {
    if (!plan || plan.issues.some((issue) => issue.severity !== 'warning')) return;
    const stamp = Date.now();
    const tasks = plan.milestones.flatMap((milestone) => milestone.projects.flatMap((project) => project.tasks.map((task, index): Task => ({
      id: `import-${stamp}-${task.tempId}-${index}`, title: task.title, goal: plan.goal.title, project: project.title,
      duration: task.durationMinutes || 0, priority: 'medium', progress: 0, status: 'todo', scheduledDate: task.date,
      completionCriteria: task.completionCriteria, steps: task.steps.map((step, position) => ({ id: `import-${stamp}-${step.tempId}-${position}`, title: step.title, minutes: step.minutes, completed: false })),
    }))));
    confirm(tasks);
  };
  return <><Header title="导入计划" back={back} action="?" /><ScrollView scrollY className="screen-scroll"><View className="import-hero"><Text className="overline">零 AI API 成本</Text><Text className="form-question">粘贴已有计划</Text><Text className="form-help">内容只在 DayStep 中按确定性规则解析，不会发送给第三方 AI。</Text><View className="import-tabs"><Button className={sourceType === 'markdown' ? 'active' : ''} onClick={() => setSourceType('markdown')}>Markdown</Button><Button className={sourceType === 'json' ? 'active' : ''} onClick={() => setSourceType('json')}>JSON</Button></View><Textarea value={source} onInput={(event) => { setSource(event.detail.value); setPlan(null); }} placeholder="# 目标: 三个月内托福达到 100 分&#10;- 开始日期: 2026-11-01&#10;## 阶段: 阅读强化…" maxlength={500000} /><View className="import-actions"><Button className="secondary-button" onClick={chooseFile}>选择 .md / .json</Button><Button className="primary-button" disabled={!source.trim()} onClick={recognize}>识别计划</Button></View>{error && <View className="import-error">{error}</View>}</View>{plan && <View className="import-preview"><View className="section-row compact"><View><Text className="section-label">结构预览</Text><Text className="section-title">识别结果</Text></View><Text className="muted">{plan.milestones.length} 个阶段</Text></View><Text className="field-label">目标</Text><Input value={plan.goal.title} onInput={(event) => updateGoal(event.detail.value)} />{plan.milestones.map((milestone, mi) => <View className="preview-milestone" key={milestone.tempId}><Text>{milestone.title}</Text>{milestone.projects.map((project, pi) => <View key={project.tempId}><Text>{project.title}</Text>{project.tasks.map((task, ti) => <View className="preview-task" key={task.tempId}><Input value={task.title} onInput={(event) => updateTaskTitle(mi, pi, ti, event.detail.value)} /><Text>{task.date || '日期待确认'} · {task.durationMinutes || 0} 分钟 · {task.steps.length} 个步骤</Text></View>)}</View>)}</View>)}{plan.issues.length > 0 && <View className="issue-list">{plan.issues.map((issue, index) => <View className={`issue ${issue.severity}`} key={`${issue.code}-${index}`}><Text>{issue.severity === 'error' ? '错误' : issue.severity === 'confirmation' ? '待确认' : '提示'}</Text><Text>{issue.message}</Text></View>)}</View>}{plan.issues.some((issue) => issue.code === 'task.date.confirm' || issue.code === 'goal.startDate.confirm') && <View className="schedule-box"><Text className="section-title">生成可解释排程草案</Text><Input value={startDate} onInput={(event) => setStartDate(event.detail.value)} /><View className="composer-minutes"><Input type="number" value={dailyMinutes} onInput={(event) => setDailyMinutes(event.detail.value)} /><Text>分钟/天</Text></View><Button onClick={arrange}>按顺序和时长排程</Button></View>}<Button className="complete-button" disabled={plan.issues.some((issue) => issue.severity !== 'warning')} onClick={finish}>确认导入并生成打卡任务</Button></View>}<View className="manual-entry"><Text>不想导入？</Text><Button onClick={openManual}>继续手动创建目标</Button></View></ScrollView></>;
}

function Statistics({ tasks }: { tasks: Task[] }) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [approved, setApproved] = useState(() => { try { return Taro.getStorageSync(ADJUSTMENT_STORAGE_KEY) === 'approved'; } catch { return false; } });
  const insights = useMemo(() => calculateTaskInsights(tasks), [tasks]);
  const bars = period === 'week' ? [32, 48, 41, 66, 58, 74, insights.completionRate] : [38, 52, 61, insights.completionRate];
  const approve = () => { if (saveLocal(ADJUSTMENT_STORAGE_KEY, 'approved')) setApproved(true); };
  return <><Header title="成长统计" action="⋯" /><ScrollView scrollY className="screen-scroll"><View className="stats-period"><Button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}>本周</Button><Button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}>本月</Button></View><View className="score-summary"><View><Text className="overline">执行评分</Text><Text className="score-number">{insights.score}</Text><Text className="score-caption">满分 100 · 按完成率、行动频率和步骤证据计算</Text></View><View className="score-badge">{insights.score >= 80 ? '稳定' : insights.score >= 60 ? '推进中' : '需调整'}</View></View><View className="metric-grid"><View><Text>{insights.completionRate}%</Text><Text>平均完成率</Text></View><View><Text>{insights.completedMinutes}</Text><Text>完成分钟</Text></View><View><Text>{insights.activeDays}/7</Text><Text>行动天数</Text></View></View><View className="trend-panel"><View className="section-row compact"><View><Text className="section-label">完成趋势</Text><Text className="section-title">{period === 'week' ? '最近 7 天' : '最近 4 周'}</Text></View><Text className="muted">单位 %</Text></View><View className="mobile-bars">{bars.map((value, index) => <View key={`${period}-${index}`}><View style={{ height: `${Math.max(12, value)}%` }} className={index === bars.length - 1 ? 'current' : ''} /><Text>{period === 'week' ? ['一','二','三','四','五','六','日'][index] : `${index + 1}周`}</Text></View>)}</View></View><View className="evidence-panel"><Text className="section-label">评分证据</Text><Text className="section-title">为什么是 {insights.score} 分</Text>{insights.evidence.map((item) => <View key={item}><Text>✓</Text><Text>{item}</Text></View>)}</View><View className="adjustment-panel"><Text className="section-label">规则建议</Text><Text className="section-title">下一周期调整</Text><Text className="adjustment-copy">{insights.suggestion}</Text><Text className="adjustment-note">建议由本地确定性规则生成，不会自动修改现有任务。</Text>{approved ? <View className="adjustment-approved">✓ 已批准，等待进入下一周期排程</View> : <Button onClick={approve}>批准这项调整</Button>}</View></ScrollView></>;
}

const studentFeedback = [
  { id: 'f1', taskId: 'course', subject: '概率论课程复习', teacher: '秦老师', score: 88, status: '已批改', submittedAt: '10 月 10 日 09:42', comment: '组合数计算正确。请补充互斥事件可以直接相加的判断依据。', annotation: '第 2 题：写出事件 A 与 B 不可能同时发生。', revision: true },
  { id: 'f2', taskId: 'reading', subject: '托福阅读精练', teacher: '秦老师', score: 92, status: '已通过', submittedAt: '10 月 8 日 20:16', comment: '定位速度明显提升，错题归因完整。下一次继续记录干扰项类型。', annotation: 'Passage 1 第 7 题的排除过程很好。', revision: false },
];

function AssignmentFeedback({ openTask, back }: { openTask: (taskId: string) => void; back: () => void }) {
  const [selectedId, setSelectedId] = useState(studentFeedback[0].id);
  const selected = studentFeedback.find((item) => item.id === selectedId) || studentFeedback[0];
  return <><Header title="批改反馈" back={back} /><ScrollView scrollY className="screen-scroll"><View className="feedback-hero"><Text className="overline">LEARNING FEEDBACK</Text><Text className="feedback-hero-title">每一次反馈，都是下一步。</Text><Text>查看评分、页内批注和订正要求。</Text></View><View className="mobile-feedback-tabs">{studentFeedback.map((item) => <Button className={selected.id === item.id ? 'active' : ''} key={item.id} onClick={() => setSelectedId(item.id)}><Text>{item.subject}</Text><Text>{item.score} 分</Text></Button>)}</View><View className="feedback-result-card"><View className="feedback-result-head"><View><Text className="section-label">{selected.status}</Text><Text className="section-title">{selected.subject}</Text><Text className="muted">{selected.teacher} · {selected.submittedAt}</Text></View><View className="feedback-grade"><Text>{selected.score}</Text><Text>/ 100</Text></View></View><View className="feedback-message"><Text className="section-label">教师评语</Text><Text>{selected.comment}</Text></View><View className="feedback-message annotation-message"><Text className="section-label">页内批注</Text><Text>{selected.annotation}</Text></View>{selected.revision ? <View className="revision-callout"><Text>需要订正</Text><Text>完成订正后重新提交，原始记录和本次评分会继续保留。</Text></View> : <View className="passed-callout">✓ 本次成果已通过</View>}<Button className="complete-button" onClick={() => openTask(selected.taskId)}>{selected.revision ? '去完成订正' : '查看对应任务'}</Button></View></ScrollView></>;
}

function HistoryCalendar({ tasks, openTask, back }: { tasks: Task[]; openTask: (task: Task) => void; back: () => void }) {
  const [monthOffset, setMonthOffset] = useState(0); const [selectedDay, setSelectedDay] = useState(today.getDate());
  const monthDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1); const year = monthDate.getFullYear(); const month = monthDate.getMonth();
  const leading = monthDate.getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const completedDays = new Set([2, 4, 5, 7, 8, 10, Math.min(today.getDate(), daysInMonth)]);
  const cells = [...Array.from({ length: leading }, () => 0), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const selectedTasks = selectedDay === today.getDate() && monthOffset === 0 ? tasks : tasks.filter((_, index) => index < (completedDays.has(selectedDay) ? 2 : 1));
  return <><Header title="历史日历" back={back} /><ScrollView scrollY className="screen-scroll"><View className="history-summary"><View><Text className="overline">本月记录</Text><Text className="history-streak">连续 8 天</Text><Text>稳定完成比一次做很多更重要。</Text></View><View className="history-rate"><Text>76%</Text><Text>完成率</Text></View></View><View className="history-calendar"><View className="history-month"><Button aria-label="上个月" onClick={() => { setMonthOffset(monthOffset - 1); setSelectedDay(1); }}>‹</Button><Text>{year} 年 {month + 1} 月</Text><Button aria-label="下个月" onClick={() => { setMonthOffset(monthOffset + 1); setSelectedDay(1); }}>›</Button></View><View className="history-weekdays">{['日','一','二','三','四','五','六'].map((day) => <Text key={day}>{day}</Text>)}</View><View className="history-days">{cells.map((day, index) => day === 0 ? <View key={`blank-${index}`} /> : <Button className={`${selectedDay === day ? 'selected' : ''} ${completedDays.has(day) ? 'completed' : ''}`} key={day} onClick={() => setSelectedDay(day)}><Text>{day}</Text>{completedDays.has(day) && <Text>•</Text>}</Button>)}</View></View><View className="history-day"><View className="section-row compact"><View><Text className="section-label">{month + 1} 月 {selectedDay} 日</Text><Text className="section-title">执行记录</Text></View><Text className="muted">{completedDays.has(selectedDay) ? '已打卡' : '计划记录'}</Text></View>{selectedTasks.map((task) => <Button className="history-task" key={task.id} onClick={() => openTask(task)}><View className="task-icon"><Text>{task.title.at(0)}</Text></View><View><Text>{task.title}</Text><Text>{task.duration} 分钟 · 完成 {task.progress}%</Text></View><Text>›</Text></Button>)}</View></ScrollView></>;
}

function Profile({ tasks, draft }: { tasks: Task[]; draft: PlanDraft | null }) {
  const [profile, setProfile] = useState<ProfilePreferences>(() => { try { return restoreProfile(Taro.getStorageSync(PROFILE_STORAGE_KEY)); } catch { return restoreProfile(null); } });
  const [exported, setExported] = useState(false);
  const update = (next: ProfilePreferences) => { setProfile(next); saveLocal(PROFILE_STORAGE_KEY, next); };
  const exportData = async () => {
    const payload = createDataExport(profile, draft, tasks, new Date().toISOString());
    try { await Taro.setClipboardData({ data: payload }); setExported(true); globalThis.setTimeout(() => setExported(false), 2400); } catch { setExported(false); }
  };
  return <><Header title="我的 DayStep" action="⋯" /><ScrollView scrollY className="screen-scroll"><View className="profile-card"><View className="profile-avatar">{profile.name.at(0)?.toUpperCase()}</View><Input value={profile.name} maxlength={40} onInput={(event) => update({ ...profile, name: event.detail.value })} /><Text>DayStep 个人工作空间</Text><View className="role-control">{(['member','student','teacher'] as const).map((role) => <Button className={profile.role === role ? 'active' : ''} key={role} onClick={() => update({ ...profile, role })}>{role === 'member' ? '普通用户' : role === 'student' ? '学生' : '老师'}</Button>)}</View></View><View className="profile-section"><Text className="section-label">提醒设置</Text><View className="setting-row"><View><Text>每日任务提醒</Text><Text>仅保存偏好，系统通知需发布后授权</Text></View><Switch checked={profile.reminders} color="#315F49" onChange={(event) => update({ ...profile, reminders: event.detail.value })} /></View><View className="setting-row"><View><Text>提醒时间</Text><Text>{profile.reminders ? '每天按此时间提醒' : '开启提醒后生效'}</Text></View><Input value={profile.reminderTime} disabled={!profile.reminders} onInput={(event) => update({ ...profile, reminderTime: event.detail.value })} /></View><View className="setting-row"><View><Text>每周成长报告</Text><Text>汇总任务、步骤和执行评分</Text></View><Switch checked={profile.weeklyReport} color="#315F49" onChange={(event) => update({ ...profile, weeklyReport: event.detail.value })} /></View></View><View className="profile-section"><Text className="section-label">数据与隐私</Text><View className="data-summary"><View><Text>{tasks.length}</Text><Text>任务</Text></View><View><Text>{tasks.reduce((sum, task) => sum + task.steps.length, 0)}</Text><Text>步骤</Text></View><View><Text>{draft ? 1 : 0}</Text><Text>草稿</Text></View></View><Button className="export-button" onClick={exportData}>{exported ? '✓ 数据已复制到剪贴板' : '导出我的 DayStep 数据'}</Button><Text className="privacy-note">导出在本机完成，不会将内容发送给第三方 AI。</Text></View><View className="profile-section about-section"><Text className="section-label">关于</Text><View><Text>DayStep V6.2</Text><Text>本地开发版本 · daystep.plan.v1</Text></View></View></ScrollView></>;
}

function GeneratedPlan({ goal, back, edit, save }: { goal: string; back: () => void; edit: () => void; save: () => void }) {
  return <><Header title="计划草稿" back={edit} /><ScrollView scrollY className="screen-scroll"><View className="generated-plan"><View className="generated-mark">✓</View><Text className="form-question">计划草稿已生成</Text><Text className="form-help">请先检查结构，确认后再加入正式计划。</Text><View className="draft-goal"><Text>目标</Text><Text>{goal}</Text></View><View className="draft-structure"><View><Text>阶段 1</Text><Text>基础能力建立 · 4 周</Text></View><View><Text>阶段 2</Text><Text>专项强化训练 · 5 周</Text></View><View><Text>阶段 3</Text><Text>模拟与复盘 · 3 周</Text></View></View><View className="draft-summary"><View><Text>3</Text><Text>阶段</Text></View><View><Text>8</Text><Text>项目</Text></View><View><Text>36</Text><Text>任务</Text></View></View><Button className="primary-button draft-save" onClick={save}>保存草稿并返回</Button><Button className="secondary-button draft-edit" onClick={edit}>返回修改</Button></View></ScrollView></>;
}

function CreateGoal({ back, initialDraft, saved }: { back: () => void; initialDraft: PlanDraft | null; saved: (draft: PlanDraft) => void }) {
  const [step, setStep] = useState(1); const [goal, setGoal] = useState(initialDraft?.goal || ''); const [level, setLevel] = useState(initialDraft?.level || ''); const [deadline, setDeadline] = useState(initialDraft?.deadline || '2027-01-18'); const [minutes, setMinutes] = useState(initialDraft?.minutes || '90'); const [weekends, setWeekends] = useState(initialDraft?.weekends || false); const [generated, setGenerated] = useState(false);
  if (generated) return <GeneratedPlan goal={goal} back={back} edit={() => setGenerated(false)} save={() => { const draft = { goal, level, deadline, minutes, weekends, savedAt: Date.now() }; if (saveLocal(DRAFT_STORAGE_KEY, draft)) { saved(draft); back(); } }} />;
  return <><Header title="AI 创建目标" back={back} action="?" /><ScrollView scrollY className="screen-scroll"><View className="wizard-progress"><View><Text>第 {step} 步，共 3 步</Text><Text>{step === 1 ? '描述你的目标' : step === 2 ? '告诉我你的节奏' : '确认并生成计划'}</Text></View><ProgressBar value={step * 33.33} /></View>{step === 1 && <View className="form-card"><Text className="form-question">你想实现什么目标？</Text><Text className="form-help">写得越具体，计划会越适合你。</Text><Textarea value={goal} onInput={(event) => setGoal(event.detail.value)} placeholder="例如：我想在三个月内将托福提高到 100 分…" maxlength={500} /><Text className="field-label">目前情况</Text><Textarea className="short" value={level} onInput={(event) => setLevel(event.detail.value)} placeholder="目前水平、已完成进度、主要困难…" maxlength={300} /><View className="suggestions"><Button onClick={() => setGoal('三个月内托福达到 100 分，重点提升阅读和听力')}>托福备考</Button><Button onClick={() => setGoal('每周完成四次力量与体能训练')}>健身训练</Button><Button onClick={() => setGoal('今年阅读 24 本非虚构书籍')}>阅读计划</Button></View></View>}{step === 2 && <View className="form-card"><Text className="form-question">安排一个可持续的节奏</Text><Text className="field-label">目标日期</Text><Input value={deadline} onInput={(event) => setDeadline(event.detail.value)} /><Text className="field-label">每天可投入时间</Text><View className="minutes-input"><Input type="number" value={minutes} onInput={(event) => setMinutes(event.detail.value)} /><Text>分钟</Text></View><View className="switch-row"><View><Text>周末也安排任务</Text><Text>可以稍后在计划中调整</Text></View><Switch checked={weekends} color="#315F49" onChange={(event) => setWeekends(event.detail.value)} /></View><Text className="field-label">偏好的执行强度</Text><Picker mode="selector" range={['轻松持续', '均衡推进', '集中冲刺']}><View className="picker-value">均衡推进　⌄</View></Picker></View>}{step === 3 && <View className="form-card review-card"><Text className="form-question">准备生成你的计划</Text><View className="ai-summary"><Text>目标</Text><Text>{goal || '尚未填写目标'}</Text><Text>当前情况</Text><Text>{level || '未提供'}</Text><Text>期限</Text><Text>{deadline}</Text><Text>投入时间</Text><Text>每天 {minutes} 分钟</Text></View><View className="ai-notice"><Text>✦</Text><Text>AI 将生成阶段、里程碑、项目、每周计划、每日任务与具体步骤。生成结果会先作为草稿，不会自动修改正式计划。</Text></View></View>}<View className="wizard-actions">{step > 1 && <Button className="secondary-button" onClick={() => setStep(step - 1)}>上一步</Button>}<Button className="primary-button" disabled={step === 1 && !goal.trim()} onClick={() => step < 3 ? setStep(step + 1) : setGenerated(true)}>{step === 3 ? '生成计划草稿 ✦' : '继续'}</Button></View></ScrollView></>;
}

function BottomNav({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) { return <>{screen === 'profile' && <View className="profile-shortcuts"><Button onClick={() => setScreen('feedback')}><Text>评</Text><View><Text>批改反馈</Text><Text>评分、评语与订正</Text></View><Text>›</Text></Button><Button onClick={() => setScreen('history')}><Text>历</Text><View><Text>历史日历</Text><Text>按日期查看执行记录</Text></View><Text>›</Text></Button></View>}<View className="bottom-nav"><Button aria-label="今日任务" className={screen === 'today' ? 'active' : ''} onClick={() => setScreen('today')}><Text className="nav-icon">⌂</Text><Text>今日</Text></Button><Button aria-label="目标地图" className={screen === 'map' ? 'active' : ''} onClick={() => setScreen('map')}><Text className="nav-icon">◇</Text><Text>目标</Text></Button><Button aria-label="导入或创建计划" className="nav-create" onClick={() => setScreen('import')}><Text>＋</Text></Button><Button aria-label="成长统计" className={screen === 'stats' ? 'active' : ''} onClick={() => setScreen('stats')}><Text className="nav-icon">▥</Text><Text>统计</Text></Button><Button aria-label="我的 DayStep" className={screen === 'profile' ? 'active' : ''} onClick={() => setScreen('profile')}><Text className="nav-icon">○</Text><Text>我的</Text></Button></View></>; }

export default function Index() {
  const [screen, setScreen] = useState<Screen>('today'); const [tasks, setTasks] = useState(loadTasks); const [draft, setDraft] = useState(loadPlanDraft); const [selectedId, setSelectedId] = useState('reading');
  const selected = useMemo(() => tasks.find((task) => task.id === selectedId) || tasks[0], [tasks, selectedId]);
  const openTask = (task = tasks[0]) => { setSelectedId(task.id); setScreen('task'); };
  const updateTask = (next: Task) => setTasks((current) => { const updated = current.map((task) => task.id === next.id ? next : task); saveLocal(TASKS_STORAGE_KEY, updated); return updated; });
  const importTasks = (incoming: Task[]) => setTasks((current) => { const updated = [...current, ...incoming]; if (saveLocal(TASKS_STORAGE_KEY, updated)) setScreen('today'); return updated; });
  return <View className="mobile-app">{screen === 'today' && <Today tasks={tasks} openTask={openTask} openCreate={() => setScreen('import')} />}{screen === 'map' && <GoalMap draft={draft} openDraft={() => setScreen('create')} openTask={() => openTask(tasks[0])} />}{screen === 'stats' && <Statistics tasks={tasks} />}{screen === 'profile' && <Profile tasks={tasks} draft={draft} />}{screen === 'feedback' && <AssignmentFeedback openTask={(taskId) => openTask(tasks.find((task) => task.id === taskId) || tasks[0])} back={() => setScreen('profile')} />}{screen === 'history' && <HistoryCalendar tasks={tasks} openTask={openTask} back={() => setScreen('profile')} />}{screen === 'task' && <TaskDetail task={selected} updateTask={updateTask} back={() => setScreen('today')} />}{screen === 'import' && <ImportPlan back={() => setScreen('today')} openManual={() => setScreen('create')} confirm={importTasks} />}{screen === 'create' && <CreateGoal initialDraft={draft} saved={setDraft} back={() => setScreen('today')} />}{screen !== 'task' && screen !== 'create' && screen !== 'import' && screen !== 'feedback' && screen !== 'history' && <BottomNav screen={screen} setScreen={setScreen} />}</View>;
}
