import { bigint, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';

const id = (name = 'id') => varchar(name, { length: 36 });
const lifecycle = {
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow().onUpdateNow(),
  archivedAt: timestamp('archived_at', { mode: 'string' }),
};

export const users = mysqlTable('users', {
  id: id().primaryKey(), email: varchar('email', { length: 254 }), status: mysqlEnum('status', ['active', 'disabled', 'deleted']).notNull().default('active'), ...lifecycle,
}, (table) => [uniqueIndex('users_email_unique').on(table.email)]);

export const authIdentities = mysqlTable('auth_identities', {
  id: id().primaryKey(), userId: id('user_id').notNull().references(() => users.id),
  provider: mysqlEnum('provider', ['wechat', 'email', 'phone', 'custom']).notNull(), providerSubject: varchar('provider_subject', { length: 191 }).notNull(),
  lastAuthenticatedAt: timestamp('last_authenticated_at', { mode: 'string' }), ...lifecycle,
}, (table) => [uniqueIndex('auth_identity_provider_subject_unique').on(table.provider, table.providerSubject), index('auth_identity_user_idx').on(table.userId)]);

export const profiles = mysqlTable('profiles', {
  userId: id('user_id').primaryKey().references(() => users.id), displayName: varchar('display_name', { length: 80 }).notNull(), avatarKey: varchar('avatar_key', { length: 512 }), locale: varchar('locale', { length: 16 }).notNull().default('zh-CN'), timezone: varchar('timezone', { length: 64 }).notNull().default('Asia/Shanghai'), ...lifecycle,
});

export const workspaces = mysqlTable('workspaces', {
  id: id().primaryKey(), ownerId: id('owner_id').notNull().references(() => users.id), name: varchar('name', { length: 120 }).notNull(), type: mysqlEnum('type', ['personal', 'classroom']).notNull(), ...lifecycle,
}, (table) => [index('workspace_owner_idx').on(table.ownerId)]);

export const workspaceMembers = mysqlTable('workspace_members', {
  id: id().primaryKey(), workspaceId: id('workspace_id').notNull().references(() => workspaces.id), userId: id('user_id').notNull().references(() => users.id), role: mysqlEnum('role', ['owner', 'teacher', 'student', 'member']).notNull(), joinedAt: timestamp('joined_at', { mode: 'string' }).notNull().defaultNow(), ...lifecycle,
}, (table) => [uniqueIndex('workspace_member_unique').on(table.workspaceId, table.userId), index('workspace_member_user_idx').on(table.userId)]);

export const planImports = mysqlTable('plan_imports', {
  id: id().primaryKey(), workspaceId: id('workspace_id').notNull().references(() => workspaces.id), ownerId: id('owner_id').notNull().references(() => users.id), sourceType: mysqlEnum('source_type', ['markdown', 'json']).notNull(), rawSource: text('raw_source').notNull(), contentHash: varchar('content_hash', { length: 64 }).notNull(), parserVersion: varchar('parser_version', { length: 32 }).notNull(), schemaVersion: varchar('schema_version', { length: 32 }).notNull(), status: mysqlEnum('status', ['preview', 'needs_confirmation', 'confirmed', 'rejected']).notNull(), structuredDraft: json('structured_draft'), idempotencyKey: varchar('idempotency_key', { length: 100 }), ...lifecycle,
}, (table) => [uniqueIndex('plan_import_workspace_hash_unique').on(table.workspaceId, table.contentHash), uniqueIndex('plan_import_idempotency_unique').on(table.workspaceId, table.idempotencyKey)]);

export const goals = mysqlTable('goals', {
  id: id().primaryKey(), workspaceId: id('workspace_id').notNull().references(() => workspaces.id), ownerId: id('owner_id').notNull().references(() => users.id), sourceImportId: id('source_import_id').references(() => planImports.id), title: varchar('title', { length: 240 }).notNull(), startDate: varchar('start_date', { length: 10 }), endDate: varchar('end_date', { length: 10 }), status: mysqlEnum('status', ['draft', 'active', 'completed', 'archived']).notNull().default('active'), version: int('version').notNull().default(1), ...lifecycle,
}, (table) => [index('goal_workspace_idx').on(table.workspaceId)]);

export const milestones = mysqlTable('milestones', {
  id: id().primaryKey(), workspaceId: id('workspace_id').notNull().references(() => workspaces.id), goalId: id('goal_id').notNull().references(() => goals.id), title: varchar('title', { length: 240 }).notNull(), position: int('position').notNull(), ...lifecycle,
}, (table) => [uniqueIndex('milestone_position_unique').on(table.goalId, table.position)]);

export const projects = mysqlTable('projects', {
  id: id().primaryKey(), workspaceId: id('workspace_id').notNull().references(() => workspaces.id), milestoneId: id('milestone_id').notNull().references(() => milestones.id), title: varchar('title', { length: 240 }).notNull(), position: int('position').notNull(), ...lifecycle,
}, (table) => [uniqueIndex('project_position_unique').on(table.milestoneId, table.position)]);

export const tasks = mysqlTable('tasks', {
  id: id().primaryKey(), workspaceId: id('workspace_id').notNull().references(() => workspaces.id), goalId: id('goal_id').notNull().references(() => goals.id), milestoneId: id('milestone_id').notNull().references(() => milestones.id), projectId: id('project_id').notNull().references(() => projects.id), assigneeId: id('assignee_id').references(() => users.id), sourceImportId: id('source_import_id').references(() => planImports.id), title: varchar('title', { length: 300 }).notNull(), durationMinutes: int('duration_minutes').notNull().default(0), priority: mysqlEnum('priority', ['low', 'medium', 'high']).notNull().default('medium'), status: mysqlEnum('status', ['todo', 'active', 'done', 'submitted', 'review']).notNull().default('todo'), completionCriteria: text('completion_criteria'), version: int('version').notNull().default(1), ...lifecycle,
}, (table) => [index('task_workspace_assignee_idx').on(table.workspaceId, table.assigneeId), index('task_project_idx').on(table.projectId)]);

export const steps = mysqlTable('steps', {
  id: id().primaryKey(), workspaceId: id('workspace_id').notNull().references(() => workspaces.id), taskId: id('task_id').notNull().references(() => tasks.id), title: varchar('title', { length: 300 }).notNull(), minutes: int('minutes'), position: int('position').notNull(), ...lifecycle,
}, (table) => [uniqueIndex('step_position_unique').on(table.taskId, table.position)]);

export const taskInstances = mysqlTable('task_instances', {
  id: id().primaryKey(), workspaceId: id('workspace_id').notNull().references(() => workspaces.id), taskId: id('task_id').notNull().references(() => tasks.id), assigneeId: id('assignee_id').notNull().references(() => users.id), scheduledDate: varchar('scheduled_date', { length: 10 }).notNull(), status: mysqlEnum('status', ['scheduled', 'active', 'done', 'skipped']).notNull().default('scheduled'), score: int('score'), generationKey: varchar('generation_key', { length: 100 }).notNull(), version: int('version').notNull().default(1), ...lifecycle,
}, (table) => [uniqueIndex('task_instance_generation_unique').on(table.workspaceId, table.generationKey), index('task_instance_assignee_date_idx').on(table.assigneeId, table.scheduledDate)]);

export const checkinEvents = mysqlTable('checkin_events', {
  id: id().primaryKey(), workspaceId: id('workspace_id').notNull().references(() => workspaces.id), taskInstanceId: id('task_instance_id').notNull().references(() => taskInstances.id), userId: id('user_id').notNull().references(() => users.id), completedStepIds: json('completed_step_ids').notNull(), note: text('note'), score: int('score'), clientEventId: varchar('client_event_id', { length: 100 }).notNull(), createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
}, (table) => [uniqueIndex('checkin_client_event_unique').on(table.workspaceId, table.clientEventId), index('checkin_instance_idx').on(table.taskInstanceId)]);

export const submissions = mysqlTable('submissions', {
  id: id().primaryKey(), workspaceId: id('workspace_id').notNull().references(() => workspaces.id), taskId: id('task_id').notNull().references(() => tasks.id), studentId: id('student_id').notNull().references(() => users.id), status: mysqlEnum('status', ['submitted', 'reviewing', 'revision', 'graded']).notNull(), currentVersion: int('current_version').notNull().default(1), idempotencyKey: varchar('idempotency_key', { length: 100 }).notNull(), submittedAt: timestamp('submitted_at', { mode: 'string' }).notNull().defaultNow(), ...lifecycle,
}, (table) => [uniqueIndex('submission_idempotency_unique').on(table.workspaceId, table.idempotencyKey), index('submission_task_student_idx').on(table.taskId, table.studentId)]);

export const submissionVersions = mysqlTable('submission_versions', {
  id: id().primaryKey(), submissionId: id('submission_id').notNull().references(() => submissions.id), version: int('version').notNull(), note: text('note'), submittedAt: timestamp('submitted_at', { mode: 'string' }).notNull().defaultNow(),
}, (table) => [uniqueIndex('submission_version_unique').on(table.submissionId, table.version)]);

export const attachments = mysqlTable('attachments', {
  id: id().primaryKey(), workspaceId: id('workspace_id').notNull().references(() => workspaces.id), submissionVersionId: id('submission_version_id').references(() => submissionVersions.id), ownerId: id('owner_id').notNull().references(() => users.id), objectKey: varchar('object_key', { length: 512 }).notNull(), originalName: varchar('original_name', { length: 255 }).notNull(), mimeType: varchar('mime_type', { length: 120 }).notNull(), byteSize: bigint('byte_size', { mode: 'number' }).notNull(), status: mysqlEnum('status', ['pending', 'ready', 'rejected', 'deleted']).notNull().default('pending'), sha256: varchar('sha256', { length: 64 }), ...lifecycle,
}, (table) => [uniqueIndex('attachment_object_key_unique').on(table.objectKey), index('attachment_workspace_idx').on(table.workspaceId)]);

export const gradingRecords = mysqlTable('grading_records', {
  id: id().primaryKey(), workspaceId: id('workspace_id').notNull().references(() => workspaces.id), submissionVersionId: id('submission_version_id').notNull().references(() => submissionVersions.id), teacherId: id('teacher_id').notNull().references(() => users.id), score: int('score').notNull(), comment: text('comment').notNull(), needsRevision: int('needs_revision').notNull().default(0), publishedAt: timestamp('published_at', { mode: 'string' }), version: int('version').notNull().default(1), ...lifecycle,
}, (table) => [index('grading_submission_idx').on(table.submissionVersionId)]);

export const annotations = mysqlTable('annotations', {
  id: id().primaryKey(), workspaceId: id('workspace_id').notNull().references(() => workspaces.id), gradingRecordId: id('grading_record_id').notNull().references(() => gradingRecords.id), attachmentId: id('attachment_id').references(() => attachments.id), page: int('page'), payload: json('payload').notNull(), ...lifecycle,
});

export const invitations = mysqlTable('invitations', {
  id: id().primaryKey(), workspaceId: id('workspace_id').notNull().references(() => workspaces.id), createdBy: id('created_by').notNull().references(() => users.id), email: varchar('email', { length: 254 }).notNull(), role: mysqlEnum('role', ['teacher', 'student', 'member']).notNull(), tokenHash: varchar('token_hash', { length: 64 }).notNull(), status: mysqlEnum('status', ['pending', 'accepted', 'revoked', 'expired']).notNull().default('pending'), expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(), ...lifecycle,
}, (table) => [uniqueIndex('invitation_token_hash_unique').on(table.tokenHash), index('invitation_workspace_email_idx').on(table.workspaceId, table.email)]);

export const notifications = mysqlTable('notifications', {
  id: id().primaryKey(), workspaceId: id('workspace_id').references(() => workspaces.id), userId: id('user_id').notNull().references(() => users.id), channel: mysqlEnum('channel', ['in_app', 'wechat', 'email']).notNull(), type: varchar('type', { length: 80 }).notNull(), payload: json('payload').notNull(), status: mysqlEnum('status', ['pending', 'sent', 'failed', 'read']).notNull().default('pending'), dedupeKey: varchar('dedupe_key', { length: 120 }).notNull(), sentAt: timestamp('sent_at', { mode: 'string' }), ...lifecycle,
}, (table) => [uniqueIndex('notification_dedupe_unique').on(table.userId, table.dedupeKey)]);

export const auditLogs = mysqlTable('audit_logs', {
  id: id().primaryKey(), workspaceId: id('workspace_id').references(() => workspaces.id), actorId: id('actor_id').references(() => users.id), action: varchar('action', { length: 120 }).notNull(), resourceType: varchar('resource_type', { length: 80 }).notNull(), resourceId: varchar('resource_id', { length: 36 }), requestId: varchar('request_id', { length: 64 }).notNull(), metadata: json('metadata'), createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
}, (table) => [index('audit_workspace_created_idx').on(table.workspaceId, table.createdAt), uniqueIndex('audit_request_action_unique').on(table.requestId, table.action)]);
