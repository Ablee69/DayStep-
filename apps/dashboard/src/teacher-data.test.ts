import { describe, expect, it } from 'vitest';
import { buildTeacherProgressSnapshot } from './teacher-data';

describe('buildTeacherProgressSnapshot', () => {
  it('builds the hierarchy and derives progress from completed steps', () => {
    const result = buildTeacherProgressSnapshot({
      members: [{ user_id: 'student-1', role: 'student', joined_at: '2026-10-01', archived_at: null }],
      profiles: [{ user_id: 'student-1', display_name: '林同学' }],
      goals: [{ id: 'goal-1', owner_id: 'student-1', title: '托福 100 分', status: 'active', version: 2, archived_at: null }],
      milestones: [{ id: 'milestone-1', goal_id: 'goal-1', title: '基础阶段', position: 1, archived_at: null }],
      projects: [{ id: 'project-1', milestone_id: 'milestone-1', title: '阅读训练', position: 1, archived_at: null }],
      tasks: [{ id: 'task-1', goal_id: 'goal-1', project_id: 'project-1', title: '精读文章', status: 'active', archived_at: null }],
      steps: [
        { id: 'step-1', task_id: 'task-1', title: '阅读', position: 1, archived_at: null },
        { id: 'step-2', task_id: 'task-1', title: '复盘', position: 2, archived_at: null },
      ],
      taskInstances: [{ id: 'instance-1', task_id: 'task-1', assignee_id: 'student-1', status: 'active' }],
      checkins: [{ task_instance_id: 'instance-1', completed_step_ids: ['step-1'], score: 90, created_at: '2026-10-22T09:00:00Z' }],
    });

    expect(result.students).toHaveLength(1);
    expect(result.students[0].progress).toBe(50);
    expect(result.students[0].averageScore).toBe(90);
    expect(result.students[0].goals[0].milestones[0].projects[0].tasks[0].steps).toEqual([
      { id: 'step-1', title: '阅读', completed: true },
      { id: 'step-2', title: '复盘', completed: false },
    ]);
  });

  it('does not expose non-student members as students', () => {
    const result = buildTeacherProgressSnapshot({
      members: [{ user_id: 'teacher-1', role: 'teacher', archived_at: null }],
      profiles: [{ user_id: 'teacher-1', display_name: '秦老师' }],
      goals: [], milestones: [], projects: [], tasks: [], steps: [], taskInstances: [], checkins: [],
    });
    expect(result.students).toEqual([]);
  });
});
