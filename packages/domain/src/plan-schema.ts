import type { Id } from './models';

export const DAYSTEP_PLAN_SCHEMA_VERSION = 'daystep.plan.v1' as const;

export type ImportIssue = {
  code: string;
  severity: 'error' | 'warning' | 'confirmation';
  path: string;
  message: string;
};

export type PlanStepDraft = { tempId: Id; title: string; minutes?: number };
export type PlanTaskDraft = {
  tempId: Id;
  title: string;
  date?: string;
  durationMinutes?: number;
  completionCriteria?: string;
  steps: PlanStepDraft[];
};
export type PlanProjectDraft = { tempId: Id; title: string; tasks: PlanTaskDraft[] };
export type PlanMilestoneDraft = { tempId: Id; title: string; projects: PlanProjectDraft[] };

export type DayStepPlanV1 = {
  schemaVersion: typeof DAYSTEP_PLAN_SCHEMA_VERSION;
  sourceType: 'markdown' | 'json';
  goal: { tempId: Id; title: string; startDate?: string; endDate?: string };
  milestones: PlanMilestoneDraft[];
  issues: ImportIssue[];
};

export type PlanImport = {
  id: Id;
  workspaceId: Id;
  ownerId: Id;
  sourceType: 'markdown' | 'json';
  rawSource: string;
  contentHash: string;
  parserVersion: 'daystep-parser.v1';
  schemaVersion: typeof DAYSTEP_PLAN_SCHEMA_VERSION;
  status: 'preview' | 'needs_confirmation' | 'confirmed' | 'rejected';
  createdAt: string;
};

export type PlanImportDraft = { importId: Id; plan: DayStepPlanV1; updatedAt: string };

export const dayStepPlanJsonSchema = {
  $id: DAYSTEP_PLAN_SCHEMA_VERSION,
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'sourceType', 'goal', 'milestones', 'issues'],
  properties: {
    schemaVersion: { const: DAYSTEP_PLAN_SCHEMA_VERSION },
    sourceType: { enum: ['markdown', 'json'] },
    goal: { type: 'object', required: ['tempId', 'title'], additionalProperties: false },
    milestones: { type: 'array' },
    issues: { type: 'array' },
  },
} as const;

export function validatePlan(plan: DayStepPlanV1): ImportIssue[] {
  const issues: ImportIssue[] = [];
  if (plan.schemaVersion !== DAYSTEP_PLAN_SCHEMA_VERSION) issues.push({ code: 'schema.version', severity: 'error', path: 'schemaVersion', message: '不支持的计划格式版本' });
  if (!plan.goal.title.trim()) issues.push({ code: 'goal.title.required', severity: 'error', path: 'goal.title', message: '目标名称不能为空' });
  if (!plan.goal.startDate) issues.push({ code: 'goal.startDate.confirm', severity: 'confirmation', path: 'goal.startDate', message: '请确认计划开始日期' });
  if (plan.milestones.length === 0) issues.push({ code: 'milestone.required', severity: 'confirmation', path: 'milestones', message: '计划中没有明确阶段' });
  plan.milestones.forEach((milestone, mi) => {
    if (!milestone.title.trim()) issues.push({ code: 'milestone.title.required', severity: 'error', path: `milestones.${mi}.title`, message: '阶段名称不能为空' });
    milestone.projects.forEach((project, pi) => {
      project.tasks.forEach((task, ti) => {
        const path = `milestones.${mi}.projects.${pi}.tasks.${ti}`;
        if (!task.title.trim()) issues.push({ code: 'task.title.required', severity: 'error', path: `${path}.title`, message: '任务名称不能为空' });
        if (!task.date) issues.push({ code: 'task.date.confirm', severity: 'confirmation', path: `${path}.date`, message: `请确认任务“${task.title}”的日期` });
        if (task.steps.length === 0) issues.push({ code: 'task.steps.warning', severity: 'warning', path: `${path}.steps`, message: `任务“${task.title}”没有执行步骤` });
      });
    });
  });
  return issues;
}
