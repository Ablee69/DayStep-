CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.current_user_id()
RETURNS varchar(36)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT identity.user_id
  FROM public.auth_identities AS identity
  WHERE identity.provider_subject = auth.uid()
    AND identity.archived_at IS NULL
  ORDER BY identity.created_at ASC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION app_private.is_workspace_member(target_workspace_id varchar(36))
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
      AND member.archived_at IS NULL
  )
$$;

REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated;
REVOKE ALL ON FUNCTION app_private.current_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_workspace_member(varchar) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_workspace_member(varchar) TO authenticated;

GRANT SELECT ON public.users, public.auth_identities, public.profiles, public.workspaces, public.workspace_members TO authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.auth_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_identities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces FORCE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members FORCE ROW LEVEL SECURITY;

CREATE POLICY users_read_self
ON public.users
FOR SELECT
TO authenticated
USING (id = app_private.current_user_id());

CREATE POLICY auth_identities_read_self
ON public.auth_identities
FOR SELECT
TO authenticated
USING (user_id = app_private.current_user_id());

CREATE POLICY profiles_read_self
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = app_private.current_user_id());

CREATE POLICY workspaces_read_memberships
ON public.workspaces
FOR SELECT
TO authenticated
USING (app_private.is_workspace_member(id));

CREATE POLICY workspace_members_read_workspace
ON public.workspace_members
FOR SELECT
TO authenticated
USING (app_private.is_workspace_member(workspace_id));
