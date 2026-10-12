import { describe, expect, it } from 'vitest';
import type { Task } from '@daystep/domain';
import { calculateTaskInsights, restorePlanDraft, restoreTasks } from './storage';

const fallback: Task[] = [{
  id: 'fallback', title: 'Fallback', goal: 'Goal', project: 'Project', duration: 10,
  dueTime: '09:00', priority: 'medium', progress: 0, status: 'todo', steps: [],
}];

describe('mobile storage recovery', () => {
  it('falls back when stored tasks are unavailable', () => {
    expect(restoreTasks(null, fallback)).toBe(fallback);
    expect(restoreTasks([], fallback)).toBe(fallback);
  });

  it('restores a non-empty task collection', () => {
    const stored = [{ ...fallback[0], id: 'stored' }];
    expect(restoreTasks(stored, fallback)).toBe(stored);
  });

  it('rejects invalid drafts and normalizes optional fields', () => {
    expect(restorePlanDraft({ goal: '' })).toBeNull();
    expect(restorePlanDraft({ goal: 'Read 24 books', deadline: '2027-01-01', minutes: '30' })).toEqual({
      goal: 'Read 24 books', level: '', deadline: '2027-01-01', minutes: '30', weekends: false, savedAt: 0,
    });
  });
});

describe('deterministic task insights', () => {
  it('explains its score from completion, consistency, and step evidence', () => {
    const tasks: Task[] = [
      { ...fallback[0], id: 'one', duration: 40, progress: 50, status: 'active', scheduledDate: '2026-10-11', steps: [{ id: 's1', title: 'One', completed: true }, { id: 's2', title: 'Two', completed: false }] },
      { ...fallback[0], id: 'two', duration: 20, progress: 0, scheduledDate: '2026-10-12', steps: [{ id: 's3', title: 'Three', completed: false }] },
    ];
    const result = calculateTaskInsights(tasks);
    expect(result.completionRate).toBe(25);
    expect(result.completedSteps).toBe(1);
    expect(result.totalSteps).toBe(3);
    expect(result.completedMinutes).toBe(20);
    expect(result.evidence).toHaveLength(3);
    expect(result.suggestion).toContain('1 个尚未开始');
  });
});
