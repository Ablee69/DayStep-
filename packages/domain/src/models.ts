export type Id = string;
export type Role = 'owner' | 'teacher' | 'student' | 'member';
export type TaskStatus = 'todo' | 'active' | 'done' | 'submitted' | 'review';

export type User = { id: Id; email: string; name: string };
export type Workspace = { id: Id; name: string; ownerId: Id; createdAt: string };
export type Membership = { workspaceId: Id; userId: Id; role: Role; createdAt: string };

export type Goal = { id: Id; workspaceId: Id; title: string; startDate?: string; endDate?: string; sourceImportId?: Id };
export type Milestone = { id: Id; goalId: Id; title: string; position: number };
export type Project = { id: Id; milestoneId: Id; title: string; position: number };

export type Step = { id: Id; title: string; completed: boolean; minutes?: number; position?: number };
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
  status: TaskStatus;
  workspaceId?: Id;
  goalId?: Id;
  milestoneId?: Id;
  projectId?: Id;
  scheduledDate?: string;
  completionCriteria?: string;
  assigneeId?: Id;
  sourceImportId?: Id;
};

export type DailyTaskInstance = {
  id: Id;
  workspaceId: Id;
  taskId: Id;
  assigneeId: Id;
  date: string;
  status: 'scheduled' | 'active' | 'done' | 'skipped';
  score?: number;
};

export type CheckIn = {
  id: Id;
  dailyTaskInstanceId: Id;
  userId: Id;
  completedStepIds: Id[];
  note?: string;
  score?: number;
  createdAt: string;
};

export type Invitation = {
  id: Id;
  workspaceId: Id;
  email: string;
  role: Extract<Role, 'teacher' | 'student' | 'member'>;
  status: 'pending' | 'accepted' | 'revoked';
  createdBy: Id;
};

export type Submission = {
  id: Id;
  workspaceId: Id;
  taskId: Id;
  studentId: Id;
  note?: string;
  files: string[];
  status: 'submitted' | 'reviewing' | 'revision' | 'graded';
  submittedAt: string;
};

export type Review = {
  id: Id;
  submissionId: Id;
  teacherId: Id;
  score: number;
  comment: string;
  needsRevision: boolean;
  publishedAt: string;
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
