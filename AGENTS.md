# DayStep Repository Instructions

## Source of truth

- `docs/PRD.md` is the sole product requirements baseline for DayStep V6.2.
- Files in `references/` are visual references, not product specifications.
- Do not invent requirements, remove required detail, or claim untested functionality is complete.

## Current scope

Phase A delivered six interactive UI pages:

1. Mobile Today
2. Mobile Goal Map
3. Mobile Task Detail
4. Mobile AI Goal Creation
5. Desktop Teacher Dashboard
6. Desktop Assignment Review Workspace

The product owner explicitly approved Phase B-D development on `feature/daystep-foundation-phase2`. Phase C prioritizes deterministic Markdown/JSON import without third-party AI APIs.

## Engineering rules

- Preserve the domain hierarchy: Goal -> Milestone -> Project -> Task -> Step.
- Keep core domain logic independent of browser DOM and WeChat APIs.
- Treat cloud data as authoritative; local state is a cache or prototype fixture only.
- Keep personal, student, and teacher workspace permissions explicit.
- Never place credentials, private keys, AI keys, or production secrets in source control.
- Mark mock data and unverified integrations clearly.
- Test before marking a feature complete.

## Git safety

- Work on `feature/daystep-foundation-phase2` for Phase B-D. Keep Phase A history on `feature/daystep-ui-phase1`.
- Do not force-push, overwrite `main`, merge, or publish without confirmation.
- Do not discard unrelated or uncommitted user changes.
