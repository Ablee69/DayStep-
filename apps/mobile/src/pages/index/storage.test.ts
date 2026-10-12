import { describe, expect, it } from 'vitest';
import type { Task } from '@daystep/domain';
import { restorePlanDraft, restoreTasks } from './storage';

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
