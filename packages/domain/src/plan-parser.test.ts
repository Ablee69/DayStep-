import { describe, expect, it } from 'vitest';
import { parseJsonPlan, parseMarkdownPlan, scheduleUndatedTasks } from './plan-parser';

const validMarkdown = `# 目标: 三个月内托福达到 100 分
- 开始日期: 2026-11-01
- 截止日期: 2027-01-31

## 阶段: 阅读基础强化
### 子项目: TPO 阅读训练
#### 日期: 2026-11-01
##### 任务: 完成 TPO 54 Passage 1
- 预计时长: 45 分钟
- 完成标准: 完成全文并记录全部错题
- 步骤: 限时完成文章
- 步骤: 核对答案`;

describe('DayStep plan parser', () => {
  it('parses the documented Markdown format deterministically', () => {
    const first = parseMarkdownPlan(validMarkdown);
    const second = parseMarkdownPlan(validMarkdown);
    expect(first).toEqual(second);
    expect(first.goal.title).toBe('三个月内托福达到 100 分');
    expect(first.milestones[0].projects[0].tasks[0]).toMatchObject({ date: '2026-11-01', durationMinutes: 45 });
    expect(first.issues).toEqual([]);
  });

  it('marks missing dates for confirmation instead of guessing', () => {
    const plan = parseMarkdownPlan(validMarkdown.replace('#### 日期: 2026-11-01\n', ''));
    expect(plan.issues).toContainEqual(expect.objectContaining({ code: 'task.date.confirm', severity: 'confirmation' }));
    const scheduled = scheduleUndatedTasks(plan, '2026-11-03', 60);
    expect(scheduled.plan.milestones[0].projects[0].tasks[0].date).toBe('2026-11-03');
    expect(Object.values(scheduled.reasons)[0]).toContain('每日 60 分钟上限');
  });

  it('rejects unsafe JSON keys and unsupported versions', () => {
    expect(() => parseJsonPlan('{"schemaVersion":"future"}')).toThrow('不支持');
    expect(() => parseJsonPlan('{"schemaVersion":"daystep.plan.v1","constructor":{}}')).toThrow('不允许');
  });
});
