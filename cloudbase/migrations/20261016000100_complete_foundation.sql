CREATE TABLE IF NOT EXISTS "annotations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"workspace_id" varchar(36) NOT NULL,
	"grading_record_id" varchar(36) NOT NULL,
	"attachment_id" varchar(36),
	"page" integer,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);

CREATE TABLE IF NOT EXISTS "attachments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"workspace_id" varchar(36) NOT NULL,
	"submission_version_id" varchar(36),
	"owner_id" varchar(36) NOT NULL,
	"object_key" varchar(512) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"byte_size" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sha256" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"workspace_id" varchar(36),
	"actor_id" varchar(36),
	"action" varchar(120) NOT NULL,
	"resource_type" varchar(80) NOT NULL,
	"resource_id" varchar(36),
	"request_id" varchar(64) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "auth_identities" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"provider" text NOT NULL,
	"provider_subject" varchar(191) NOT NULL,
	"last_authenticated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);

CREATE TABLE IF NOT EXISTS "checkin_events" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"workspace_id" varchar(36) NOT NULL,
	"task_instance_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"completed_step_ids" jsonb NOT NULL,
	"note" text,
	"score" integer,
	"client_event_id" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "grading_records" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"workspace_id" varchar(36) NOT NULL,
	"submission_version_id" varchar(36) NOT NULL,
	"teacher_id" varchar(36) NOT NULL,
	"score" integer NOT NULL,
	"comment" text NOT NULL,
	"needs_revision" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);

CREATE TABLE IF NOT EXISTS "invitations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"workspace_id" varchar(36) NOT NULL,
	"created_by" varchar(36) NOT NULL,
	"email" varchar(254) NOT NULL,
	"role" text NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);

CREATE TABLE IF NOT EXISTS "notifications" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"workspace_id" varchar(36),
	"user_id" varchar(36) NOT NULL,
	"channel" text NOT NULL,
	"type" varchar(80) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"dedupe_key" varchar(120) NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);

CREATE TABLE IF NOT EXISTS "submission_versions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"submission_id" varchar(36) NOT NULL,
	"version" integer NOT NULL,
	"note" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "submissions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"workspace_id" varchar(36) NOT NULL,
	"task_id" varchar(36) NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"status" text NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"idempotency_key" varchar(100) NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);

CREATE TABLE IF NOT EXISTS "task_instances" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"workspace_id" varchar(36) NOT NULL,
	"task_id" varchar(36) NOT NULL,
	"assignee_id" varchar(36) NOT NULL,
	"scheduled_date" varchar(10) NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"score" integer,
	"generation_key" varchar(100) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);

ALTER TABLE "annotations" ADD CONSTRAINT "annotations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_grading_record_id_grading_records_id_fk" FOREIGN KEY ("grading_record_id") REFERENCES "public"."grading_records"("id");
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_attachment_id_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."attachments"("id");
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_submission_version_id_submission_versions_id_fk" FOREIGN KEY ("submission_version_id") REFERENCES "public"."submission_versions"("id");
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id");
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id");
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");
ALTER TABLE "checkin_events" ADD CONSTRAINT "checkin_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");
ALTER TABLE "checkin_events" ADD CONSTRAINT "checkin_events_task_instance_id_task_instances_id_fk" FOREIGN KEY ("task_instance_id") REFERENCES "public"."task_instances"("id");
ALTER TABLE "checkin_events" ADD CONSTRAINT "checkin_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");
ALTER TABLE "grading_records" ADD CONSTRAINT "grading_records_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");
ALTER TABLE "grading_records" ADD CONSTRAINT "grading_records_submission_version_id_submission_versions_id_fk" FOREIGN KEY ("submission_version_id") REFERENCES "public"."submission_versions"("id");
ALTER TABLE "grading_records" ADD CONSTRAINT "grading_records_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id");
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");
ALTER TABLE "submission_versions" ADD CONSTRAINT "submission_versions_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id");
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id");
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id");
ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");
ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id");
ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "attachment_object_key_unique" ON "attachments" ("object_key");
CREATE INDEX IF NOT EXISTS "attachment_workspace_idx" ON "attachments" ("workspace_id");
CREATE INDEX IF NOT EXISTS "audit_workspace_created_idx" ON "audit_logs" ("workspace_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "audit_request_action_unique" ON "audit_logs" ("request_id", "action");
CREATE UNIQUE INDEX IF NOT EXISTS "auth_identity_provider_subject_unique" ON "auth_identities" ("provider", "provider_subject");
CREATE INDEX IF NOT EXISTS "auth_identity_user_idx" ON "auth_identities" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "checkin_client_event_unique" ON "checkin_events" ("workspace_id", "client_event_id");
CREATE INDEX IF NOT EXISTS "checkin_instance_idx" ON "checkin_events" ("task_instance_id");
CREATE INDEX IF NOT EXISTS "goal_workspace_idx" ON "goals" ("workspace_id");
CREATE INDEX IF NOT EXISTS "grading_submission_idx" ON "grading_records" ("submission_version_id");
CREATE UNIQUE INDEX IF NOT EXISTS "invitation_token_hash_unique" ON "invitations" ("token_hash");
CREATE INDEX IF NOT EXISTS "invitation_workspace_email_idx" ON "invitations" ("workspace_id", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "milestone_position_unique" ON "milestones" ("goal_id", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "notification_dedupe_unique" ON "notifications" ("user_id", "dedupe_key");
CREATE UNIQUE INDEX IF NOT EXISTS "plan_import_workspace_hash_unique" ON "plan_imports" ("workspace_id", "content_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "plan_import_idempotency_unique" ON "plan_imports" ("workspace_id", "idempotency_key");
CREATE UNIQUE INDEX IF NOT EXISTS "project_position_unique" ON "projects" ("milestone_id", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "step_position_unique" ON "steps" ("task_id", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "submission_version_unique" ON "submission_versions" ("submission_id", "version");
CREATE UNIQUE INDEX IF NOT EXISTS "submission_idempotency_unique" ON "submissions" ("workspace_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "submission_task_student_idx" ON "submissions" ("task_id", "student_id");
CREATE UNIQUE INDEX IF NOT EXISTS "task_instance_generation_unique" ON "task_instances" ("workspace_id", "generation_key");
CREATE INDEX IF NOT EXISTS "task_instance_assignee_date_idx" ON "task_instances" ("assignee_id", "scheduled_date");
CREATE INDEX IF NOT EXISTS "task_workspace_assignee_idx" ON "tasks" ("workspace_id", "assignee_id");
CREATE INDEX IF NOT EXISTS "task_project_idx" ON "tasks" ("project_id");
