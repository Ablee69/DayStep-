import type { Task } from '@daystep/domain';

export type PlanDraft = {
  goal: string;
  level: string;
  deadline: string;
  minutes: string;
  weekends: boolean;
  savedAt: number;
};

export const TASKS_STORAGE_KEY = 'daystep.tasks.v1';
export const DRAFT_STORAGE_KEY = 'daystep.plan-draft.v1';
export const ADJUSTMENT_STORAGE_KEY = 'daystep.adjustment.v1';

export type TaskInsights = {
  score: number;
  completionRate: number;
  activeDays: number;
  completedSteps: number;
  totalSteps: number;
  completedMinutes: number;
  suggestion: string;
  evidence: string[];
};

export function calculateTaskInsights(tasks: Task[]): TaskInsights {
  const totalSteps = tasks.reduce((sum, task) => sum + task.steps.length, 0);
  const completedSteps = tasks.reduce((sum, task) => sum + task.steps.filter((step) => step.completed).length, 0);
  const completionRate = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length) : 0;
  const stepRate = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const activeDays = Math.min(7, new Set(tasks.filter((task) => task.progress > 0).map((task) => task.scheduledDate || 'today')).size);
  const consistencyRate = Math.round((activeDays / 7) * 100);
  const score = Math.round(completionRate * 0.7 + consistencyRate * 0.2 + stepRate * 0.1);
  const completedMinutes = tasks.reduce((sum, task) => sum + Math.round(task.duration * task.progress / 100), 0);
  const untouched = tasks.filter((task) => task.progress === 0).length;
  const suggestion = untouched > 0
    ? `将 ${untouched} 个尚未开始的任务拆成 15–30 分钟的小步骤，保留原顺序并重新确认日期。`
    : completionRate < 80
      ? '减少下一周期的单日任务量，并优先完成当前进行中的任务。'
      : '当前节奏稳定，下一周期保持任务量并增加一次周末复盘。';
  return {
    score, completionRate, activeDays, completedSteps, totalSteps, completedMinutes, suggestion,
    evidence: [`任务平均完成率 ${completionRate}%`, `已完成步骤 ${completedSteps}/${totalSteps}`, `近 7 天有行动记录 ${activeDays} 天`],
  };
}

export function restoreTasks(value: unknown, fallback: Task[]): Task[] {
  return Array.isArray(value) && value.length > 0 ? value as Task[] : fallback;
}

export function restorePlanDraft(value: unknown): PlanDraft | null {
  if (!value || typeof value !== 'object') return null;
  const draft = value as Partial<PlanDraft>;
  if (typeof draft.goal !== 'string' || !draft.goal.trim()) return null;
  if (typeof draft.deadline !== 'string' || typeof draft.minutes !== 'string') return null;
  return {
    goal: draft.goal,
    level: typeof draft.level === 'string' ? draft.level : '',
    deadline: draft.deadline,
    minutes: draft.minutes,
    weekends: draft.weekends === true,
    savedAt: typeof draft.savedAt === 'number' ? draft.savedAt : 0,
  };
}
