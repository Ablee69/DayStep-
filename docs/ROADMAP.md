# DayStep V6.2 Roadmap

## Phase A: Architecture and core UI — Complete

The six-screen UI foundation, cross-platform structure, typed fixtures, interactions, builds, and tests are complete on `feature/daystep-ui-phase1`.

Deliver six interactive pages:

1. Mobile Today
2. Mobile Goal Map
3. Mobile Task Detail
4. Mobile AI Goal Creation
5. Desktop Teacher Dashboard
6. Desktop Assignment Review Workspace

Phase A acceptance requires responsive rendering, realistic typed fixtures, reusable components, working page interactions, loading/empty/error states, and tested H5 and desktop builds. Mock-backed behavior must be labeled as such.

## Phase B: Real foundations — Local foundation complete

Authentication, cloud accounts, workspaces, goal hierarchy, daily task instances, check-ins, history, synchronization, and baseline statistics.

This phase must define the canonical Goal, Milestone, Project, Task, Step, DailyTaskInstance, CheckIn, Workspace, Membership, Submission, Review, and PlanImport persistence models so imported and manually created plans share one execution system.

## Phase C: Deterministic plan import — Complete

Deliver DayStep Markdown v1, `daystep.plan.v1` JSON Schema, Markdown and JSON parsers, validation, issue reporting, editable preview, deterministic scheduling suggestions, raw-source retention, duplicate detection, and atomic confirmation into the canonical Phase B models.

The first release must not call a paid or third-party AI API. Pasted Markdown and uploaded `.md` / `.json` files are the primary inputs.

## Phase D: Teacher and student workflows — Application foundation complete

Invitations, student management, task assignment, submissions, downloads, grading, feedback, corrected resubmissions, and permission isolation.

Imported tasks must work in these workflows without a separate import-only database or reduced feature set.

## Phase E: Scoring and adaptation — Complete

Deterministic scoring, evidence display, reviews, reports, adjustment suggestions, and approval workflows.

The mobile statistics page calculates a reproducible score from task completion, action frequency, and completed-step evidence. Weekly/monthly reports, rule-based suggestions, and explicit persisted approval are implemented without an AI API.

## Phase F: Advanced review and release — Local release candidate complete

Image/PDF annotation, batch review, notifications, H5 deployment, WeChat optimization, release preparation, and real-device verification.

The local release candidate includes persisted review annotations, batch review publishing, mobile profile/role preferences, reminder preferences, weekly-report preferences, and local JSON data export. Production notification delivery, public H5 hosting, WeChat submission, and physical-device verification require deployment accounts and are tracked in `docs/RELEASE_CHECKLIST.md`.

Optional built-in AI planning may be evaluated only after deterministic import, canonical persistence, permissions, and import safety tests are complete. It must use the same versioned plan schema and confirmation flow.

No later phase should be represented as complete before its required integrations and tests exist.

## Phase G: Production cloud foundation — In progress

The selected production direction is a unified Node.js API on Tencent CloudBase cloud hosting, backed by MySQL and private COS/CloudBase object storage. WeChat and Web identities map to one DayStep user through provider-neutral identity records.

The local foundation includes the API workspace, environment contract, health/readiness checks, Drizzle relational schema, migration workflow, idempotency constraints, versioned submissions, private attachment metadata, notifications, and audit logs. Cloud resources, real identity verification, database migration execution, and storage signing remain account-dependent.
