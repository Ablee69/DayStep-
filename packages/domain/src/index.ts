export * from './models';
export * from './plan-schema';
export * from './plan-parser';
export * from './service';

import type { Step } from './models';

export function calculateTaskProgress(steps: Step[]): number {
  if (steps.length === 0) return 0;
  return Math.round((steps.filter((step) => step.completed).length / steps.length) * 100);
}
