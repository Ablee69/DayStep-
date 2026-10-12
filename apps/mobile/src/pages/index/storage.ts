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
