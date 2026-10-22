CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.can_manage_workspace(target_workspace_id varchar(36))
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    WHERE member.workspace_id = target_workspace_id
      AND member.user_id = app_private.current_user_id()
      AND member.role IN ('owner', 'teacher')
      AND member.archived_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION app_private.can_view_workspace_user(target_user_id varchar(36))
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT target_user_id = app_private.current_user_id()
    OR EXISTS (
      SELECT 1
      FROM public.workspace_members AS manager
      JOIN public.workspace_members AS target
        ON target.workspace_id = manager.workspace_id
      WHERE manager.user_id = app_private.current_user_id()
        AND manager.role IN ('owner', 'teacher')
        AND manager.archived_at IS NULL
        AND target.user_id = target_user_id
        AND target.archived_at IS NULL
    )
$$;

CREATE OR REPLACE FUNCTION app_private.can_read_goal(target_goal_id varchar(36))
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.goals AS goal
    WHERE goal.id = target_goal_id
      AND goal.archived_at IS NULL
      AND (
        goal.owner_id = app_private.current_user_id()
        OR app_private.can_manage_workspace(goal.workspace_id)
      )
  )
$$;

CREATE OR REPLACE FUNCTION app_private.can_read_task(target_task_id varchar(36))
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks AS task
    WHERE task.id = target_task_id
      AND task.archived_at IS NULL
      AND (
        task.assignee_id = app_private.current_user_id()
        OR app_private.can_read_goal(task.goal_id)
      )
  )
$$;

REVOKE ALL ON FUNCTION app_private.can_manage_workspace(varchar) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.can_view_workspace_user(varchar) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.can_read_goal(varchar) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.can_read_task(varchar) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.can_manage_workspace(varchar) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_view_workspace_user(varchar) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_read_goal(varchar) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_read_task(varchar) TO authenticated;

GRANT SELECT ON public.goals, public.milestones, public.projects, public.tasks, public.steps, public.task_instances, public.checkin_events TO authenticated;
GRANT UPDATE (title, start_date, end_date, status, version, updated_at) ON public.goals TO authenticated;

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones FORCE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.steps FORCE ROW LEVEL SECURITY;
ALTER TABLE public.task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_instances FORCE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_events FORCE ROW LEVEL SECURITY;

ALTER POLICY users_read_self
ON public.users
TO authenticated
USING (app_private.can_view_workspace_user(id));

ALTER POLICY profiles_read_self
ON public.profiles
TO authenticated
USING (app_private.can_view_workspace_user(user_id));

ALTER POLICY workspace_members_read_workspace
ON public.workspace_members
TO authenticated
USING (
  user_id = app_private.current_user_id()
  OR app_private.can_manage_workspace(workspace_id)
);

CREATE POLICY goals_read_authorized
ON public.goals
FOR SELECT
TO authenticated
USING (
  owner_id = app_private.current_user_id()
  OR app_private.can_manage_workspace(workspace_id)
);

CREATE POLICY goals_update_authorized
ON public.goals
FOR UPDATE
TO authenticated
USING (
  owner_id = app_private.current_user_id()
  OR app_private.can_manage_workspace(workspace_id)
)
WITH CHECK (
  owner_id = app_private.current_user_id()
  OR app_private.can_manage_workspace(workspace_id)
);

CREATE POLICY milestones_read_authorized
ON public.milestones
FOR SELECT
TO authenticated
USING (app_private.can_read_goal(goal_id));

CREATE POLICY projects_read_authorized
ON public.projects
FOR SELECT
TO authenticated
USING (
  app_private.can_manage_workspace(workspace_id)
  OR EXISTS (
    SELECT 1 FROM public.milestones AS milestone
    WHERE milestone.id = projects.milestone_id
      AND app_private.can_read_goal(milestone.goal_id)
  )
);

CREATE POLICY tasks_read_authorized
ON public.tasks
FOR SELECT
TO authenticated
USING (
  assignee_id = app_private.current_user_id()
  OR app_private.can_read_goal(goal_id)
);

CREATE POLICY steps_read_authorized
ON public.steps
FOR SELECT
TO authenticated
USING (app_private.can_read_task(task_id));

CREATE POLICY task_instances_read_authorized
ON public.task_instances
FOR SELECT
TO authenticated
USING (
  assignee_id = app_private.current_user_id()
  OR app_private.can_manage_workspace(workspace_id)
);

CREATE POLICY checkin_events_read_authorized
ON public.checkin_events
FOR SELECT
TO authenticated
USING (
  user_id = app_private.current_user_id()
  OR app_private.can_manage_workspace(workspace_id)
);

CREATE INDEX IF NOT EXISTS goal_workspace_owner_idx ON public.goals (workspace_id, owner_id);
CREATE INDEX IF NOT EXISTS milestone_workspace_goal_idx ON public.milestones (workspace_id, goal_id);
CREATE INDEX IF NOT EXISTS project_workspace_milestone_idx ON public.projects (workspace_id, milestone_id);
CREATE INDEX IF NOT EXISTS step_workspace_task_idx ON public.steps (workspace_id, task_id);

CREATE OR REPLACE FUNCTION app_private.audit_goal_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    id, workspace_id, actor_id, action, resource_type, resource_id, request_id, metadata, created_at
  ) VALUES (
    gen_random_uuid()::text,
    NEW.workspace_id,
    app_private.current_user_id(),
    'goal.updated',
    'goal',
    NEW.id,
    'goal-update-' || gen_random_uuid()::text,
    jsonb_build_object(
      'old_version', OLD.version,
      'new_version', NEW.version,
      'old_status', OLD.status,
      'new_status', NEW.status
    ),
    now()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER goals_audit_update
AFTER UPDATE ON public.goals
FOR EACH ROW
EXECUTE FUNCTION app_private.audit_goal_update();
