import { describe, expect, it } from 'vitest';
import { DayStepService } from './service';

const markdown = `# 目标: 托福 100 分
- 开始日期: 2026-11-01
- 截止日期: 2027-01-31
## 阶段: 阅读强化
### 子项目: TPO 训练
#### 日期: 2026-11-01
##### 任务: TPO 54 Passage 1
- 预计时长: 45 分钟
- 完成标准: 完成并复盘
- 步骤: 完成文章
- 步骤: 核对答案`;

function setup() {
  const service = new DayStepService();
  const teacher = service.createUser('teacher@daystep.test', '秦老师');
  const student = service.createUser('student@daystep.test', '林晓晴');
  const outsider = service.createUser('other@daystep.test', '其他用户');
  const workspace = service.createWorkspace(teacher.id, '秦老师的班级');
  const invite = service.invite(teacher.id, workspace.id, student.email, 'student');
  service.acceptInvitation(student.id, invite.id);
  return { service, teacher, student, outsider, workspace };
}

describe('DayStep Phase B-D service', () => {
  it('atomically confirms an import into canonical tasks and daily instances', () => {
    const { service, teacher, student, workspace } = setup();
    const preview = service.previewImport(teacher.id, workspace.id, markdown, 'markdown');
    const result = service.confirmImport(teacher.id, preview.import.id, student.id);
    expect(result.tasks).toHaveLength(1);
    expect(result.dailyTasks).toHaveLength(1);
    expect(service.listDailyTasks(student.id, workspace.id, '2026-11-01')).toHaveLength(1);
    expect(() => service.previewImport(teacher.id, workspace.id, markdown, 'markdown')).toThrow('重复导入');
  });

  it('enforces workspace and student ownership permissions', () => {
    const { service, teacher, student, outsider, workspace } = setup();
    const preview = service.previewImport(teacher.id, workspace.id, markdown, 'markdown');
    const result = service.confirmImport(teacher.id, preview.import.id, student.id);
    expect(() => service.listTasks(outsider.id, workspace.id)).toThrow('权限');
    expect(() => service.submitTask(outsider.id, workspace.id, result.tasks[0].id, [])).toThrow('权限');
  });

  it('connects check-ins, submissions, revision requests, and grading', () => {
    const { service, teacher, student, workspace } = setup();
    const preview = service.previewImport(teacher.id, workspace.id, markdown, 'markdown');
    const result = service.confirmImport(teacher.id, preview.import.id, student.id);
    const task = result.tasks[0];
    const daily = result.dailyTasks[0];
    service.checkIn(student.id, daily.id, task.steps.map((step) => step.id), '已完成', 92);
    expect(service.listTasks(student.id, workspace.id)[0].progress).toBe(100);
    const submission = service.submitTask(student.id, workspace.id, task.id, ['作业.pdf'], '请老师批改');
    const review = service.reviewSubmission(teacher.id, submission.id, 88, '请补充错题原因', true);
    expect(review.needsRevision).toBe(true);
    expect(service.snapshot(student.id, workspace.id).submissions[0].status).toBe('revision');
  });

  it('blocks confirmation while required fields remain unresolved', () => {
    const { service, teacher, workspace } = setup();
    const preview = service.previewImport(teacher.id, workspace.id, markdown.replace('#### 日期: 2026-11-01\n', ''), 'markdown');
    expect(() => service.confirmImport(teacher.id, preview.import.id)).toThrow('需要确认');
    expect(service.snapshot(teacher.id, workspace.id).goals).toHaveLength(0);
  });
});
