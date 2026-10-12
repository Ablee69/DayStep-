import type {
  CheckIn, DailyTaskInstance, Goal, Invitation, Membership, Milestone, Project, Review, Role,
  Submission, Task, User, Workspace,
} from './models';
import { contentHash, parseJsonPlan, parseMarkdownPlan } from './plan-parser';
import type { DayStepPlanV1, PlanImport, PlanImportDraft } from './plan-schema';

export type DayStepState = {
  users: User[];
  workspaces: Workspace[];
  memberships: Membership[];
  goals: Goal[];
  milestones: Milestone[];
  projects: Project[];
  tasks: Task[];
  dailyTasks: DailyTaskInstance[];
  checkIns: CheckIn[];
  imports: PlanImport[];
  importDrafts: PlanImportDraft[];
  invitations: Invitation[];
  submissions: Submission[];
  reviews: Review[];
};

const emptyState = (): DayStepState => ({ users: [], workspaces: [], memberships: [], goals: [], milestones: [], projects: [], tasks: [], dailyTasks: [], checkIns: [], imports: [], importDrafts: [], invitations: [], submissions: [], reviews: [] });
const calculateTaskProgress = (steps: Task['steps']) => steps.length === 0 ? 0 : Math.round((steps.filter((step) => step.completed).length / steps.length) * 100);

export type PersistenceAdapter = { load(): DayStepState | null; save(state: DayStepState): void };

export class MemoryPersistenceAdapter implements PersistenceAdapter {
  private state: DayStepState | null = null;
  load() { return this.state ? structuredClone(this.state) : null; }
  save(state: DayStepState) { this.state = structuredClone(state); }
}

export class LocalStoragePersistenceAdapter implements PersistenceAdapter {
  constructor(private readonly key = 'daystep.domain.v1') {}
  load() {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(this.key);
    if (!raw) return null;
    try { return JSON.parse(raw) as DayStepState; } catch { return null; }
  }
  save(state: DayStepState) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(this.key, JSON.stringify(state));
  }
}

export class DayStepService {
  private state: DayStepState;
  private sequence = 0;
  constructor(private readonly persistence: PersistenceAdapter = new MemoryPersistenceAdapter()) {
    this.state = persistence.load() || emptyState();
  }

  private id(prefix: string) { this.sequence += 1; return `${prefix}-${Date.now().toString(36)}-${this.sequence}`; }
  private now() { return new Date().toISOString(); }
  private save() { this.persistence.save(this.state); }
  private membership(workspaceId: string, userId: string) { return this.state.memberships.find((item) => item.workspaceId === workspaceId && item.userId === userId); }
  private authorize(workspaceId: string, userId: string, roles?: Role[]) {
    const membership = this.membership(workspaceId, userId);
    if (!membership || (roles && !roles.includes(membership.role))) throw new Error('没有访问此工作空间的权限');
    return membership;
  }
  private transaction<T>(operation: () => T): T {
    const snapshot = structuredClone(this.state);
    try { const result = operation(); this.save(); return result; } catch (error) { this.state = snapshot; throw error; }
  }

  createUser(email: string, name: string) {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@')) throw new Error('请输入有效邮箱');
    const existing = this.state.users.find((user) => user.email === normalized);
    if (existing) return existing;
    const user = { id: this.id('user'), email: normalized, name: name.trim() };
    this.state.users.push(user); this.save(); return user;
  }

  createWorkspace(ownerId: string, name: string) {
    if (!this.state.users.some((user) => user.id === ownerId)) throw new Error('用户不存在');
    return this.transaction(() => {
      const workspace = { id: this.id('workspace'), name: name.trim(), ownerId, createdAt: this.now() };
      this.state.workspaces.push(workspace);
      this.state.memberships.push({ workspaceId: workspace.id, userId: ownerId, role: 'owner', createdAt: this.now() });
      return workspace;
    });
  }

  invite(actorId: string, workspaceId: string, email: string, role: Invitation['role']) {
    this.authorize(workspaceId, actorId, ['owner', 'teacher']);
    const invitation: Invitation = { id: this.id('invite'), workspaceId, email: email.trim().toLowerCase(), role, status: 'pending', createdBy: actorId };
    this.state.invitations.push(invitation); this.save(); return invitation;
  }

  acceptInvitation(userId: string, invitationId: string) {
    const invitation = this.state.invitations.find((item) => item.id === invitationId);
    const user = this.state.users.find((item) => item.id === userId);
    if (!invitation || invitation.status !== 'pending' || !user || user.email !== invitation.email) throw new Error('邀请无效或与当前账号不匹配');
    return this.transaction(() => {
      invitation.status = 'accepted';
      const membership = { workspaceId: invitation.workspaceId, userId, role: invitation.role, createdAt: this.now() };
      this.state.memberships.push(membership); return membership;
    });
  }

  previewImport(actorId: string, workspaceId: string, rawSource: string, sourceType: 'markdown' | 'json') {
    this.authorize(workspaceId, actorId);
    const hash = contentHash(rawSource);
    if (this.state.imports.some((item) => item.workspaceId === workspaceId && item.contentHash === hash && item.status !== 'rejected')) throw new Error('检测到相同计划，不能重复导入');
    const plan = sourceType === 'markdown' ? parseMarkdownPlan(rawSource) : parseJsonPlan(rawSource);
    return this.transaction(() => {
      const item: PlanImport = { id: this.id('import'), workspaceId, ownerId: actorId, sourceType, rawSource, contentHash: hash, parserVersion: 'daystep-parser.v1', schemaVersion: 'daystep.plan.v1', status: plan.issues.some((issue) => issue.severity !== 'warning') ? 'needs_confirmation' : 'preview', createdAt: this.now() };
      const draft: PlanImportDraft = { importId: item.id, plan, updatedAt: this.now() };
      this.state.imports.push(item); this.state.importDrafts.push(draft); return { import: item, draft };
    });
  }

  updateImportDraft(actorId: string, importId: string, plan: DayStepPlanV1) {
    const item = this.state.imports.find((entry) => entry.id === importId);
    if (!item) throw new Error('导入记录不存在');
    this.authorize(item.workspaceId, actorId);
    const draft = this.state.importDrafts.find((entry) => entry.importId === importId)!;
    draft.plan = structuredClone(plan); draft.updatedAt = this.now(); item.status = plan.issues.some((issue) => issue.severity !== 'warning') ? 'needs_confirmation' : 'preview'; this.save(); return draft;
  }

  confirmImport(actorId: string, importId: string, assigneeId = actorId) {
    const item = this.state.imports.find((entry) => entry.id === importId);
    const draft = this.state.importDrafts.find((entry) => entry.importId === importId);
    if (!item || !draft) throw new Error('导入记录不存在');
    this.authorize(item.workspaceId, actorId);
    this.authorize(item.workspaceId, assigneeId);
    const blocking = draft.plan.issues.filter((issue) => issue.severity !== 'warning');
    if (blocking.length) throw new Error(`仍有 ${blocking.length} 个字段需要确认`);
    return this.transaction(() => {
      const goal: Goal = { id: this.id('goal'), workspaceId: item.workspaceId, title: draft.plan.goal.title, startDate: draft.plan.goal.startDate, endDate: draft.plan.goal.endDate, sourceImportId: item.id };
      this.state.goals.push(goal);
      draft.plan.milestones.forEach((milestoneDraft, milestoneIndex) => {
        const milestone: Milestone = { id: this.id('milestone'), goalId: goal.id, title: milestoneDraft.title, position: milestoneIndex };
        this.state.milestones.push(milestone);
        milestoneDraft.projects.forEach((projectDraft, projectIndex) => {
          const project: Project = { id: this.id('project'), milestoneId: milestone.id, title: projectDraft.title, position: projectIndex };
          this.state.projects.push(project);
          projectDraft.tasks.forEach((taskDraft) => {
            const steps = taskDraft.steps.map((step, position) => ({ id: this.id('step'), title: step.title, minutes: step.minutes, completed: false, position }));
            const task: Task = { id: this.id('task'), workspaceId: item.workspaceId, goalId: goal.id, milestoneId: milestone.id, projectId: project.id, goal: goal.title, project: project.title, title: taskDraft.title, duration: taskDraft.durationMinutes || 0, priority: 'medium', progress: 0, status: 'todo', scheduledDate: taskDraft.date, completionCriteria: taskDraft.completionCriteria, assigneeId, sourceImportId: item.id, steps };
            this.state.tasks.push(task);
            if (task.scheduledDate) this.state.dailyTasks.push({ id: this.id('daily'), workspaceId: item.workspaceId, taskId: task.id, assigneeId, date: task.scheduledDate, status: 'scheduled' });
          });
        });
      });
      item.status = 'confirmed';
      return { goal, tasks: this.state.tasks.filter((task) => task.sourceImportId === item.id), dailyTasks: this.state.dailyTasks.filter((task) => this.state.tasks.some((entry) => entry.sourceImportId === item.id && entry.id === task.taskId)) };
    });
  }

  listTasks(actorId: string, workspaceId: string) { this.authorize(workspaceId, actorId); return this.state.tasks.filter((task) => task.workspaceId === workspaceId); }
  listDailyTasks(actorId: string, workspaceId: string, date: string) { this.authorize(workspaceId, actorId); return this.state.dailyTasks.filter((task) => task.workspaceId === workspaceId && task.date === date && (task.assigneeId === actorId || ['owner', 'teacher'].includes(this.membership(workspaceId, actorId)!.role))); }

  checkIn(actorId: string, dailyTaskId: string, completedStepIds: string[], note?: string, score?: number) {
    const daily = this.state.dailyTasks.find((item) => item.id === dailyTaskId);
    if (!daily) throw new Error('每日任务不存在');
    const member = this.authorize(daily.workspaceId, actorId);
    if (daily.assigneeId !== actorId && !['owner', 'teacher'].includes(member.role)) throw new Error('不能代替其他成员打卡');
    return this.transaction(() => {
      const task = this.state.tasks.find((item) => item.id === daily.taskId)!;
      task.steps = task.steps.map((step) => ({ ...step, completed: completedStepIds.includes(step.id) }));
      task.progress = calculateTaskProgress(task.steps); task.status = task.progress === 100 ? 'done' : 'active'; daily.status = task.status === 'done' ? 'done' : 'active'; daily.score = score;
      const checkIn: CheckIn = { id: this.id('checkin'), dailyTaskInstanceId: daily.id, userId: actorId, completedStepIds, note, score, createdAt: this.now() };
      this.state.checkIns.push(checkIn); return checkIn;
    });
  }

  submitTask(actorId: string, workspaceId: string, taskId: string, files: string[], note?: string) {
    this.authorize(workspaceId, actorId, ['student', 'member']);
    const task = this.state.tasks.find((entry) => entry.id === taskId && entry.workspaceId === workspaceId);
    if (!task || task.assigneeId !== actorId) throw new Error('任务不存在或不属于当前学生');
    const submission: Submission = { id: this.id('submission'), workspaceId, taskId, studentId: actorId, files: [...files], note, status: 'submitted', submittedAt: this.now() };
    this.state.submissions.push(submission); task.status = 'submitted'; this.save(); return submission;
  }

  reviewSubmission(actorId: string, submissionId: string, score: number, comment: string, needsRevision: boolean) {
    const submission = this.state.submissions.find((item) => item.id === submissionId);
    if (!submission) throw new Error('提交记录不存在');
    this.authorize(submission.workspaceId, actorId, ['owner', 'teacher']);
    if (score < 0 || score > 100 || !comment.trim()) throw new Error('评分必须为 0–100 且评语不能为空');
    return this.transaction(() => {
      const review: Review = { id: this.id('review'), submissionId, teacherId: actorId, score, comment: comment.trim(), needsRevision, publishedAt: this.now() };
      this.state.reviews.push(review); submission.status = needsRevision ? 'revision' : 'graded';
      const task = this.state.tasks.find((entry) => entry.id === submission.taskId); if (task) task.status = needsRevision ? 'review' : 'done';
      return review;
    });
  }

  snapshot(actorId: string, workspaceId: string) {
    this.authorize(workspaceId, actorId);
    return structuredClone({ workspace: this.state.workspaces.find((item) => item.id === workspaceId), memberships: this.state.memberships.filter((item) => item.workspaceId === workspaceId), goals: this.state.goals.filter((item) => item.workspaceId === workspaceId), tasks: this.state.tasks.filter((item) => item.workspaceId === workspaceId), dailyTasks: this.state.dailyTasks.filter((item) => item.workspaceId === workspaceId), submissions: this.state.submissions.filter((item) => item.workspaceId === workspaceId) });
  }
}
