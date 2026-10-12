# DayStep Plan Import v1

DayStep Plan Import converts explicit Markdown or JSON into the same goal, milestone, project, task, and step records used by manually created plans. Parsing is deterministic and does not call an AI API.

## Markdown grammar

Use UTF-8 text and ISO dates (`YYYY-MM-DD`). The supported hierarchy is:

```markdown
# 目标: Goal title
- 开始日期: 2026-11-01
- 截止日期: 2027-01-31

## 阶段: Milestone title
### 子项目: Project title
#### 日期: 2026-11-01
##### 任务: Task title
- 预计时长: 45 分钟
- 完成标准: Observable completion criterion
- 步骤: First action
- 步骤: Second action
```

Repeat `## 阶段`, `### 子项目`, `#### 日期`, and `##### 任务` blocks as needed. Each task belongs to the nearest preceding project and milestone. A date immediately before a task applies to that task.

## Validation behavior

- Missing goal titles and invalid dates are errors.
- Missing dates and missing milestone hierarchy require user confirmation.
- Tasks without steps produce warnings but may be imported.
- Unknown prose is ignored; prose is never guessed into tasks.
- Input is limited to 500 KB, 2,000 nodes, and 500 characters per parsed value.
- JSON rejects unsupported schema versions and unsafe object keys.

Only plans without errors or confirmation issues can be confirmed. The UI may resolve missing task dates with the deterministic scheduler, which preserves task order and explains each assigned date.

## JSON format

JSON input must conform to [`schemas/daystep-plan.v1.schema.json`](../schemas/daystep-plan.v1.schema.json). Set `schemaVersion` to `daystep.plan.v1` and `sourceType` to `json`.

## Import safety

DayStep stores the original source, parser version, schema version, and content hash before confirmation. Confirmation maps the draft into canonical records in one transaction. Duplicate content in the same workspace is rejected, and failed confirmation leaves no partial goals or tasks.
