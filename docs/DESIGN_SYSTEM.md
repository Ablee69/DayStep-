# DayStep V6.0 Design System

## Status

Baseline prepared from the approved V6.0 PRD and the two supplied reference images. Component measurements may be refined during implementation and visual QA.

## Design direction

DayStep should feel minimal, calm, elegant, and focused. It serves teenagers, adults, teachers, and independent users, so it must avoid both dense school-administration styling and childish gamification.

The mobile reference contributes the warm neutral canvas, forest-green typography, compact routine rows, restrained progress displays, and four-item bottom navigation. The desktop reference contributes the dark fixed sidebar, white workspace, strong page hierarchy, horizontal summary modules, calendar context, and clean chart treatment. Reference branding, copy, avatars, and exact layouts must not be copied.

## Color tokens

| Token | Value | Use |
| --- | --- | --- |
| `color.brand.primary` | `#315F49` | Primary actions and progress |
| `color.brand.secondary` | `#6E9B80` | Secondary emphasis |
| `color.canvas.mobile` | `#F5F2EA` | Mobile background |
| `color.canvas.desktop` | `#F6F8F5` | Desktop background |
| `color.surface.default` | `#FFFFFF` | Main surfaces |
| `color.surface.soft` | `#E9E5DC` | Quiet grouped content |
| `color.text.primary` | `#244E3A` | Headings and primary text |
| `color.border.default` | `#E5EAE5` | Dividers and controls |
| `color.accent.purple` | `#DDD3F8` | Limited category accent |
| `color.status.warning` | `#C99C58` | Warning and pending states |
| `color.status.danger` | `#C57973` | Destructive and error states |

Semantic tokens must be defined above raw colors. Text and interactive states must be checked for WCAG contrast before approval.

## Layout

### Mobile

- Single-column layout optimized for one-handed use.
- Horizontal page padding: 16-20 px.
- Persistent four-item bottom navigation for primary destinations.
- Rounded content surfaces may use 20-24 px radii where appropriate.
- Goal hierarchy remains fully accessible; simplicity must not remove task detail.

### Desktop

- Fixed left navigation and top utility bar.
- Responsive multi-column workspace for summaries, schedules, student status, and review queues.
- Content density should support repeated teacher workflows without becoming a table-heavy admin UI.
- Mobile screens must not be enlarged unchanged for desktop.

## Typography and spacing

- Use a platform-compatible sans-serif stack with strong Simplified and Traditional Chinese coverage.
- Use a restrained type scale with clear heading, body, label, and metadata roles.
- Base spacing follows a 4 px scale; common gaps are 8, 12, 16, 20, 24, and 32 px.
- Do not reduce essential metadata below a comfortably readable mobile size.

## Core components

The initial shared system includes `AppShell`, `SidebarNavigation`, `BottomNavigation`, `GoalCard`, `MilestoneCard`, `ProjectCard`, `TaskCard`, `StepCheckbox`, `GoalMap`, `ProgressBar`, `ProgressRing`, `DailyScoreCard`, `StudentCard`, `AssignmentCard`, `FileUploadCard`, `AnnotationToolbar`, `TeacherFeedbackPanel`, `CalendarView`, `StatusBadge`, `EmptyState`, `LoadingState`, and `ConfirmationDialog`.

Each interactive component requires default, hover where applicable, focus, pressed, disabled, loading, success, and error behavior. Platform-specific primitives should sit behind adapters.

## Interaction principles

- A task should be checkable with minimal navigation while retaining access to full detail.
- Check-ins, uploads, AI generation, and published grades require immediate status feedback.
- Motion should be short, functional, and reduced when the operating system requests reduced motion.
- Destructive actions and grade publication require explicit confirmation.
- Upload failures and cloud write failures must be visible and recoverable.

## Reference files

- `references/DayStep-Mobile-Reference.png`
- `references/DayStep-Desktop-Reference.png`
