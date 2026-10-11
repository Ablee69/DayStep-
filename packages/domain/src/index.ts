export type Id = string;

export type Step = {
  id: Id;
  title: string;
  completed: boolean;
  minutes?: number;
};

export type Task = {
  id: Id;
  title: string;
  goal: string;
  project: string;
  duration: number;
  dueTime?: string;
  priority: 'low' | 'medium' | 'high';
  progress: number;
  steps: Step[];
  status: 'todo' | 'active' | 'done' | 'submitted' | 'review';
};

export type GoalNode = {
  id: Id;
  title: string;
  kind: 'goal' | 'milestone' | 'project' | 'task';
  progress: number;
  children?: GoalNode[];
};

export type Assignment = {
  id: Id;
  student: string;
  title: string;
  subject: string;
  submittedAt: string;
  status: 'pending' | 'reviewing' | 'revision' | 'graded';
  files: string[];
};

export function calculateTaskProgress(steps: Step[]): number {
  if (steps.length === 0) return 0;
  return Math.round((steps.filter((step) => step.completed).length / steps.length) * 100);
}
