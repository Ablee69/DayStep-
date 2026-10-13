CREATE TABLE `annotations` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`grading_record_id` varchar(36) NOT NULL,
	`attachment_id` varchar(36),
	`page` int,
	`payload` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `annotations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`submission_version_id` varchar(36),
	`owner_id` varchar(36) NOT NULL,
	`object_key` varchar(512) NOT NULL,
	`original_name` varchar(255) NOT NULL,
	`mime_type` varchar(120) NOT NULL,
	`byte_size` bigint NOT NULL,
	`status` enum('pending','ready','rejected','deleted') NOT NULL DEFAULT 'pending',
	`sha256` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`),
	CONSTRAINT `attachment_object_key_unique` UNIQUE(`object_key`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36),
	`actor_id` varchar(36),
	`action` varchar(120) NOT NULL,
	`resource_type` varchar(80) NOT NULL,
	`resource_id` varchar(36),
	`request_id` varchar(64) NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `audit_request_action_unique` UNIQUE(`request_id`,`action`)
);
--> statement-breakpoint
CREATE TABLE `auth_identities` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`provider` enum('wechat','email','phone','custom') NOT NULL,
	`provider_subject` varchar(191) NOT NULL,
	`last_authenticated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `auth_identities_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_identity_provider_subject_unique` UNIQUE(`provider`,`provider_subject`)
);
--> statement-breakpoint
CREATE TABLE `checkin_events` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`task_instance_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`completed_step_ids` json NOT NULL,
	`note` text,
	`score` int,
	`client_event_id` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checkin_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `checkin_client_event_unique` UNIQUE(`workspace_id`,`client_event_id`)
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`owner_id` varchar(36) NOT NULL,
	`source_import_id` varchar(36),
	`title` varchar(240) NOT NULL,
	`start_date` varchar(10),
	`end_date` varchar(10),
	`status` enum('draft','active','completed','archived') NOT NULL DEFAULT 'active',
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `grading_records` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`submission_version_id` varchar(36) NOT NULL,
	`teacher_id` varchar(36) NOT NULL,
	`score` int NOT NULL,
	`comment` text NOT NULL,
	`needs_revision` int NOT NULL DEFAULT 0,
	`published_at` timestamp,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `grading_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`created_by` varchar(36) NOT NULL,
	`email` varchar(254) NOT NULL,
	`role` enum('teacher','student','member') NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`status` enum('pending','accepted','revoked','expired') NOT NULL DEFAULT 'pending',
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitation_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`goal_id` varchar(36) NOT NULL,
	`title` varchar(240) NOT NULL,
	`position` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `milestones_id` PRIMARY KEY(`id`),
	CONSTRAINT `milestone_position_unique` UNIQUE(`goal_id`,`position`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36),
	`user_id` varchar(36) NOT NULL,
	`channel` enum('in_app','wechat','email') NOT NULL,
	`type` varchar(80) NOT NULL,
	`payload` json NOT NULL,
	`status` enum('pending','sent','failed','read') NOT NULL DEFAULT 'pending',
	`dedupe_key` varchar(120) NOT NULL,
	`sent_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_dedupe_unique` UNIQUE(`user_id`,`dedupe_key`)
);
--> statement-breakpoint
CREATE TABLE `plan_imports` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`owner_id` varchar(36) NOT NULL,
	`source_type` enum('markdown','json') NOT NULL,
	`raw_source` text NOT NULL,
	`content_hash` varchar(64) NOT NULL,
	`parser_version` varchar(32) NOT NULL,
	`schema_version` varchar(32) NOT NULL,
	`status` enum('preview','needs_confirmation','confirmed','rejected') NOT NULL,
	`structured_draft` json,
	`idempotency_key` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `plan_imports_id` PRIMARY KEY(`id`),
	CONSTRAINT `plan_import_workspace_hash_unique` UNIQUE(`workspace_id`,`content_hash`),
	CONSTRAINT `plan_import_idempotency_unique` UNIQUE(`workspace_id`,`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` varchar(36) NOT NULL,
	`display_name` varchar(80) NOT NULL,
	`avatar_key` varchar(512),
	`locale` varchar(16) NOT NULL DEFAULT 'zh-CN',
	`timezone` varchar(64) NOT NULL DEFAULT 'Asia/Shanghai',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `profiles_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`milestone_id` varchar(36) NOT NULL,
	`title` varchar(240) NOT NULL,
	`position` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_position_unique` UNIQUE(`milestone_id`,`position`)
);
--> statement-breakpoint
CREATE TABLE `steps` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`title` varchar(300) NOT NULL,
	`minutes` int,
	`position` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `steps_id` PRIMARY KEY(`id`),
	CONSTRAINT `step_position_unique` UNIQUE(`task_id`,`position`)
);
--> statement-breakpoint
CREATE TABLE `submission_versions` (
	`id` varchar(36) NOT NULL,
	`submission_id` varchar(36) NOT NULL,
	`version` int NOT NULL,
	`note` text,
	`submitted_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `submission_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `submission_version_unique` UNIQUE(`submission_id`,`version`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`student_id` varchar(36) NOT NULL,
	`status` enum('submitted','reviewing','revision','graded') NOT NULL,
	`current_version` int NOT NULL DEFAULT 1,
	`idempotency_key` varchar(100) NOT NULL,
	`submitted_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `submission_idempotency_unique` UNIQUE(`workspace_id`,`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `task_instances` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`assignee_id` varchar(36) NOT NULL,
	`scheduled_date` varchar(10) NOT NULL,
	`status` enum('scheduled','active','done','skipped') NOT NULL DEFAULT 'scheduled',
	`score` int,
	`generation_key` varchar(100) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `task_instances_id` PRIMARY KEY(`id`),
	CONSTRAINT `task_instance_generation_unique` UNIQUE(`workspace_id`,`generation_key`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`goal_id` varchar(36) NOT NULL,
	`milestone_id` varchar(36) NOT NULL,
	`project_id` varchar(36) NOT NULL,
	`assignee_id` varchar(36),
	`source_import_id` varchar(36),
	`title` varchar(300) NOT NULL,
	`duration_minutes` int NOT NULL DEFAULT 0,
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`status` enum('todo','active','done','submitted','review') NOT NULL DEFAULT 'todo',
	`completion_criteria` text,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(254),
	`status` enum('active','disabled','deleted') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role` enum('owner','teacher','student','member') NOT NULL,
	`joined_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `workspace_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspace_member_unique` UNIQUE(`workspace_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` varchar(36) NOT NULL,
	`owner_id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`type` enum('personal','classroom') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `annotations` ADD CONSTRAINT `annotations_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `annotations` ADD CONSTRAINT `annotations_grading_record_id_grading_records_id_fk` FOREIGN KEY (`grading_record_id`) REFERENCES `grading_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `annotations` ADD CONSTRAINT `annotations_attachment_id_attachments_id_fk` FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_submission_version_id_submission_versions_id_fk` FOREIGN KEY (`submission_version_id`) REFERENCES `submission_versions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auth_identities` ADD CONSTRAINT `auth_identities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `checkin_events` ADD CONSTRAINT `checkin_events_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `checkin_events` ADD CONSTRAINT `checkin_events_task_instance_id_task_instances_id_fk` FOREIGN KEY (`task_instance_id`) REFERENCES `task_instances`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `checkin_events` ADD CONSTRAINT `checkin_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `goals` ADD CONSTRAINT `goals_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `goals` ADD CONSTRAINT `goals_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `goals` ADD CONSTRAINT `goals_source_import_id_plan_imports_id_fk` FOREIGN KEY (`source_import_id`) REFERENCES `plan_imports`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grading_records` ADD CONSTRAINT `grading_records_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grading_records` ADD CONSTRAINT `grading_records_submission_version_id_submission_versions_id_fk` FOREIGN KEY (`submission_version_id`) REFERENCES `submission_versions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grading_records` ADD CONSTRAINT `grading_records_teacher_id_users_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `milestones` ADD CONSTRAINT `milestones_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `milestones` ADD CONSTRAINT `milestones_goal_id_goals_id_fk` FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_imports` ADD CONSTRAINT `plan_imports_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_imports` ADD CONSTRAINT `plan_imports_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_milestone_id_milestones_id_fk` FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `steps` ADD CONSTRAINT `steps_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `steps` ADD CONSTRAINT `steps_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submission_versions` ADD CONSTRAINT `submission_versions_submission_id_submissions_id_fk` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_student_id_users_id_fk` FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_instances` ADD CONSTRAINT `task_instances_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_instances` ADD CONSTRAINT `task_instances_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_instances` ADD CONSTRAINT `task_instances_assignee_id_users_id_fk` FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_goal_id_goals_id_fk` FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_milestone_id_milestones_id_fk` FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignee_id_users_id_fk` FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_source_import_id_plan_imports_id_fk` FOREIGN KEY (`source_import_id`) REFERENCES `plan_imports`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_members` ADD CONSTRAINT `workspace_members_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_members` ADD CONSTRAINT `workspace_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspaces` ADD CONSTRAINT `workspaces_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attachment_workspace_idx` ON `attachments` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `audit_workspace_created_idx` ON `audit_logs` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `auth_identity_user_idx` ON `auth_identities` (`user_id`);--> statement-breakpoint
CREATE INDEX `checkin_instance_idx` ON `checkin_events` (`task_instance_id`);--> statement-breakpoint
CREATE INDEX `goal_workspace_idx` ON `goals` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `grading_submission_idx` ON `grading_records` (`submission_version_id`);--> statement-breakpoint
CREATE INDEX `invitation_workspace_email_idx` ON `invitations` (`workspace_id`,`email`);--> statement-breakpoint
CREATE INDEX `submission_task_student_idx` ON `submissions` (`task_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `task_instance_assignee_date_idx` ON `task_instances` (`assignee_id`,`scheduled_date`);--> statement-breakpoint
CREATE INDEX `task_workspace_assignee_idx` ON `tasks` (`workspace_id`,`assignee_id`);--> statement-breakpoint
CREATE INDEX `task_project_idx` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX `workspace_member_user_idx` ON `workspace_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `workspace_owner_idx` ON `workspaces` (`owner_id`);