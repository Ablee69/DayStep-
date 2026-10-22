import { cloudbaseApp } from './cloudbase';

type Row = Record<string, unknown>;

export type TeacherStep = {
  id: string;
  title: string;
  completed: boolean;
};

export type TeacherTask = {
  id: string;
  title: string;
  status: string;
  progress: number;
  steps: TeacherStep[];
};

export type TeacherProject = {
  id: string;
  title: string;
  tasks: TeacherTask[];
  progress: number;
};

export type TeacherMilestone = {
  id: string;
  title: string;
  projects: TeacherProject[];
  progress: number;
};

export type TeacherGoal = {
  id: string;
  ownerId: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  version: number;
  progress: number;
  taskCount: number;
  completedTaskCount: number;
  milestones: TeacherMilestone[];
};

export type TeacherStudent = {
  id: string;
  displayName: string;
  joinedAt: string;
  progress: number;
  averageScore: number | null;
  lastActivity: string | null;
  goals: TeacherGoal[];
};

export type TeacherProgressSnapshot = {
  students: TeacherStudent[];
  refreshedAt: string;
};

export type GoalUpdate = Pick<TeacherGoal, 'id' | 'title' | 'startDate' | 'endDate' | 'status' | 'version'>;

const asString = (value: unknown) => typeof value === 'string' ? value : '';
const asNumber = (value: unknown) => typeof value === 'number' ? value : Number(value) || 0;

function percent(done: number, total: number) {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

async function selectRows(table: string, columns: string, workspaceId?: string): Promise<Row[]> {
  if (!cloudbaseApp) throw new Error('CloudBase 数据库尚未配置。');
  let query = cloudbaseApp.rdb().from(table).select(columns);
  if (workspaceId) query = query.eq('workspace_id', workspaceId);
  const result = await query.limit(2000);
  if (result.error) {
    const code = typeof result.error.code === 'string' ? ` (${result.error.code})` : '';
    throw new Error(`读取 ${table} 失败${code}：${result.error.message || '请检查数据库权限。'}`);
  }
  return Array.isArray(result.data) ? result.data as unknown as Row[] : [];
}

export function buildTeacherProgressSnapshot(input: {
  members: Row[];
  profiles: Row[];
  goals: Row[];
  milestones: Row[];
  projects: Row[];
  tasks: Row[];
  steps: Row[];
  taskInstances: Row[];
  checkins: Row[];
}): TeacherProgressSnapshot {
  const profileByUser = new Map(input.profiles.map((row) => [asString(row.user_id), row]));
  const instancesByTask = new Map<string, Row[]>();
  for (const instance of input.taskInstances) {
    const taskId = asString(instance.task_id);
    instancesByTask.set(taskId, [...(instancesByTask.get(taskId) || []), instance]);
  }

  const students = input.members
    .filter((member) => member.role === 'student' && !member.archived_at)
    .map((member): TeacherStudent => {
      const studentId = asString(member.user_id);
      const studentInstances = input.taskInstances.filter((instance) => asString(instance.assignee_id) === studentId);
      const studentInstanceIds = new Set(studentInstances.map((instance) => asString(instance.id)));
      const studentCheckins = input.checkins.filter((checkin) => studentInstanceIds.has(asString(checkin.task_instance_id)));
      const completedStepIds = new Set<string>();
      for (const checkin of studentCheckins) {
        const ids = checkin.completed_step_ids;
        if (Array.isArray(ids)) ids.forEach((id) => completedStepIds.add(asString(id)));
      }
      const studentGoals = input.goals.filter((goal) => asString(goal.owner_id) === studentId && !goal.archived_at);
      const goals = studentGoals.map((goal): TeacherGoal => {
        const goalId = asString(goal.id);
        const goalTasks = input.tasks.filter((task) => asString(task.goal_id) === goalId && !task.archived_at);
        const taskModels = goalTasks.map((task): TeacherTask => {
          const taskId = asString(task.id);
          const taskSteps = input.steps
            .filter((step) => asString(step.task_id) === taskId && !step.archived_at)
            .sort((a, b) => asNumber(a.position) - asNumber(b.position));
          const instances = instancesByTask.get(taskId) || [];
          const doneByInstance = instances.length > 0 && instances.every((instance) => instance.status === 'done');
          const doneByTask = task.status === 'done';
          const completedSteps = taskSteps.filter((step) => completedStepIds.has(asString(step.id))).length;
          const taskProgress = taskSteps.length ? percent(completedSteps, taskSteps.length) : (doneByInstance || doneByTask ? 100 : 0);
          return {
            id: taskId,
            title: asString(task.title),
            status: asString(task.status),
            progress: taskProgress,
            steps: taskSteps.map((step) => ({ id: asString(step.id), title: asString(step.title), completed: completedStepIds.has(asString(step.id)) })),
          };
        });

        const milestoneModels = input.milestones
          .filter((milestone) => asString(milestone.goal_id) === goalId && !milestone.archived_at)
          .sort((a, b) => asNumber(a.position) - asNumber(b.position))
          .map((milestone): TeacherMilestone => {
            const milestoneId = asString(milestone.id);
            const projectModels = input.projects
              .filter((project) => asString(project.milestone_id) === milestoneId && !project.archived_at)
              .sort((a, b) => asNumber(a.position) - asNumber(b.position))
              .map((project): TeacherProject => {
                const projectTasks = taskModels.filter((task) => {
                  const source = goalTasks.find((row) => asString(row.id) === task.id);
                  return asString(source?.project_id) === asString(project.id);
                });
                return {
                  id: asString(project.id),
                  title: asString(project.title),
                  tasks: projectTasks,
                  progress: average(projectTasks.map((task) => task.progress)),
                };
              });
            return {
              id: milestoneId,
              title: asString(milestone.title),
              projects: projectModels,
              progress: average(projectModels.flatMap((project) => project.tasks.map((task) => task.progress))),
            };
          });
        return {
          id: goalId,
          ownerId: studentId,
          title: asString(goal.title),
          startDate: asString(goal.start_date),
          endDate: asString(goal.end_date),
          status: (asString(goal.status) || 'active') as TeacherGoal['status'],
          version: asNumber(goal.version) || 1,
          progress: average(taskModels.map((task) => task.progress)),
          taskCount: taskModels.length,
          completedTaskCount: taskModels.filter((task) => task.progress === 100).length,
          milestones: milestoneModels,
        };
      });

      const scores = studentCheckins
        .filter((checkin) => checkin.score !== null && checkin.score !== undefined)
        .map((checkin) => asNumber(checkin.score))
        .filter((score) => Number.isFinite(score) && score >= 0 && score <= 100);
      const activities = studentCheckins.map((checkin) => asString(checkin.created_at)).filter(Boolean).sort();
      const profile = profileByUser.get(studentId);
      return {
        id: studentId,
        displayName: asString(profile?.display_name) || '未命名学生',
        joinedAt: asString(member.joined_at),
        progress: average(goals.map((goal) => goal.progress)),
        averageScore: scores.length ? average(scores) : null,
        lastActivity: activities.at(-1) || null,
        goals,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'zh-CN'));

  return { students, refreshedAt: new Date().toISOString() };
}

export async function loadTeacherProgress(workspaceId: string): Promise<TeacherProgressSnapshot> {
  const [members, profiles, goals, milestones, projects, tasks, steps, taskInstances, checkins] = await Promise.all([
    selectRows('workspace_members', 'user_id,role,joined_at,archived_at', workspaceId),
    selectRows('profiles', 'user_id,display_name,avatar_key,archived_at'),
    selectRows('goals', 'id,workspace_id,owner_id,title,start_date,end_date,status,version,archived_at', workspaceId),
    selectRows('milestones', 'id,workspace_id,goal_id,title,position,archived_at', workspaceId),
    selectRows('projects', 'id,workspace_id,milestone_id,title,position,archived_at', workspaceId),
    selectRows('tasks', 'id,workspace_id,goal_id,milestone_id,project_id,assignee_id,title,status,archived_at', workspaceId),
    selectRows('steps', 'id,workspace_id,task_id,title,position,archived_at', workspaceId),
    selectRows('task_instances', 'id,workspace_id,task_id,assignee_id,status,score,scheduled_date,archived_at', workspaceId),
    selectRows('checkin_events', 'id,workspace_id,task_instance_id,user_id,completed_step_ids,score,created_at', workspaceId),
  ]);
  return buildTeacherProgressSnapshot({ members, profiles, goals, milestones, projects, tasks, steps, taskInstances, checkins });
}

export async function updateTeacherGoal(update: GoalUpdate): Promise<void> {
  if (!cloudbaseApp) throw new Error('CloudBase 数据库尚未配置。');
  const title = update.title.trim();
  if (!title) throw new Error('目标名称不能为空。');
  if (update.startDate && update.endDate && update.startDate > update.endDate) throw new Error('截止日期不能早于开始日期。');
  const result = await cloudbaseApp.rdb().from('goals').update({
    title,
    start_date: update.startDate || null,
    end_date: update.endDate || null,
    status: update.status,
    version: update.version + 1,
    updated_at: new Date().toISOString(),
  }).eq('id', update.id).eq('version', update.version).select('id');
  if (result.error) throw new Error(`保存目标失败：${result.error.message || '请检查教师权限。'}`);
  if (!Array.isArray(result.data) || result.data.length !== 1) throw new Error('目标已被其他用户更新，请刷新后再试。');
}
