import {
  DAYSTEP_PLAN_SCHEMA_VERSION, type DayStepPlanV1, type ImportIssue, type PlanMilestoneDraft,
  type PlanProjectDraft, type PlanTaskDraft, validatePlan,
} from './plan-schema';

const LIMITS = { sourceLength: 500_000, nodes: 2_000, depth: 8, text: 500 } as const;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function clean(value: string) {
  return value.trim().slice(0, LIMITS.text);
}

function id(prefix: string, index: number) {
  return `${prefix}-${index + 1}`;
}

export function contentHash(source: string) {
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}-${source.length}`;
}

export function parseMarkdownPlan(source: string): DayStepPlanV1 {
  if (source.length > LIMITS.sourceLength) throw new Error('计划内容超过 500 KB 限制');
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const plan: DayStepPlanV1 = {
    schemaVersion: DAYSTEP_PLAN_SCHEMA_VERSION,
    sourceType: 'markdown',
    goal: { tempId: 'goal-1', title: '' },
    milestones: [],
    issues: [],
  };
  let milestone: PlanMilestoneDraft | undefined;
  let project: PlanProjectDraft | undefined;
  let task: PlanTaskDraft | undefined;
  let pendingDate: string | undefined;
  let nodeCount = 1;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('<!--')) continue;
    let match: RegExpMatchArray | null;
    if ((match = line.match(/^#\s*目标\s*:\s*(.+)$/))) plan.goal.title = clean(match[1]);
    else if ((match = line.match(/^[-*]\s*开始日期\s*:\s*(.+)$/))) plan.goal.startDate = clean(match[1]);
    else if ((match = line.match(/^[-*]\s*截止日期\s*:\s*(.+)$/))) plan.goal.endDate = clean(match[1]);
    else if ((match = line.match(/^##\s*阶段\s*:\s*(.+)$/))) {
      milestone = { tempId: id('milestone', plan.milestones.length), title: clean(match[1]), projects: [] };
      plan.milestones.push(milestone); project = undefined; task = undefined; nodeCount += 1;
    } else if ((match = line.match(/^###\s*子项目\s*:\s*(.+)$/))) {
      if (!milestone) { plan.issues.push(issue('project.parent', 'confirmation', 'milestones', '子项目缺少明确的所属阶段')); continue; }
      project = { tempId: id(`${milestone.tempId}-project`, milestone.projects.length), title: clean(match[1]), tasks: [] };
      milestone.projects.push(project); task = undefined; nodeCount += 1;
    } else if ((match = line.match(/^####\s*日期\s*:\s*(.+)$/))) {
      pendingDate = clean(match[1]);
    } else if ((match = line.match(/^#####\s*任务\s*:\s*(.+)$/))) {
      if (!project) { plan.issues.push(issue('task.parent', 'confirmation', 'milestones', '任务缺少明确的所属阶段或子项目')); continue; }
      task = { tempId: id(`${project.tempId}-task`, project.tasks.length), title: clean(match[1]), date: pendingDate, steps: [] };
      pendingDate = undefined;
      project.tasks.push(task); nodeCount += 1;
    } else if ((match = line.match(/^[-*]\s*日期\s*:\s*(.+)$/))) {
      if (task) task.date = clean(match[1]);
    } else if ((match = line.match(/^[-*]\s*预计时长\s*:\s*(\d+)\s*(?:分钟|min)?$/i))) {
      if (task) task.durationMinutes = Number(match[1]);
    } else if ((match = line.match(/^[-*]\s*完成标准\s*:\s*(.+)$/))) {
      if (task) task.completionCriteria = clean(match[1]);
    } else if ((match = line.match(/^[-*]\s*步骤\s*:\s*(.+)$/))) {
      if (!task) { plan.issues.push(issue('step.parent', 'confirmation', 'tasks', '步骤缺少明确的所属任务')); continue; }
      task.steps.push({ tempId: id(`${task.tempId}-step`, task.steps.length), title: clean(match[1]) }); nodeCount += 1;
    }
    if (nodeCount > LIMITS.nodes) throw new Error('计划节点超过 2000 个限制');
  }
  plan.milestones.forEach((item) => item.projects.forEach((child) => child.tasks.forEach((entry) => {
    if (entry.date && !isoDate.test(entry.date)) plan.issues.push(issue('date.invalid', 'error', `${entry.tempId}.date`, `日期“${entry.date}”必须使用 YYYY-MM-DD`));
  })));
  plan.issues = [...plan.issues, ...validatePlan(plan)];
  return plan;
}

function issue(code: string, severity: ImportIssue['severity'], path: string, message: string): ImportIssue {
  return { code, severity, path, message };
}

function hasUnsafeKeys(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).some((key) => ['__proto__', 'constructor', 'prototype'].includes(key) || hasUnsafeKeys((value as Record<string, unknown>)[key]));
}

export function parseJsonPlan(source: string): DayStepPlanV1 {
  if (source.length > LIMITS.sourceLength) throw new Error('计划内容超过 500 KB 限制');
  const value: unknown = JSON.parse(source);
  if (hasUnsafeKeys(value)) throw new Error('计划 JSON 包含不允许的字段');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('计划 JSON 根节点必须是对象');
  const input = value as Partial<DayStepPlanV1>;
  if (input.schemaVersion !== DAYSTEP_PLAN_SCHEMA_VERSION) throw new Error('不支持的计划格式版本');
  const plan: DayStepPlanV1 = {
    schemaVersion: DAYSTEP_PLAN_SCHEMA_VERSION,
    sourceType: 'json',
    goal: input.goal as DayStepPlanV1['goal'],
    milestones: Array.isArray(input.milestones) ? input.milestones : [],
    issues: [],
  };
  plan.issues = validatePlan(plan);
  return plan;
}

export function scheduleUndatedTasks(plan: DayStepPlanV1, startDate: string, dailyMinutes: number) {
  if (!isoDate.test(startDate) || dailyMinutes < 1) throw new Error('排程需要有效开始日期和每日可用分钟数');
  let date = new Date(`${startDate}T00:00:00Z`);
  let used = 0;
  const reasons: Record<string, string> = {};
  plan.milestones.forEach((milestone) => milestone.projects.forEach((project) => project.tasks.forEach((task) => {
    if (task.date) return;
    const duration = task.durationMinutes || 30;
    if (used > 0 && used + duration > dailyMinutes) { date = new Date(date.getTime() + 86_400_000); used = 0; }
    task.date = date.toISOString().slice(0, 10); used += duration;
    reasons[task.tempId] = `依据原任务顺序、预计 ${duration} 分钟和每日 ${dailyMinutes} 分钟上限顺延`;
  })));
  plan.goal.startDate ||= startDate;
  plan.issues = validatePlan(plan);
  return { plan, reasons };
}
