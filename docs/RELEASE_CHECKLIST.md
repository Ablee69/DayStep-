# DayStep V6.2 Release Checklist

Date: 2026-10-12

## Engineering complete

- [x] Dashboard production build
- [x] Mobile H5 production build
- [x] WeChat mini-program production build
- [x] Strict TypeScript checks
- [x] Domain, dashboard, mobile persistence, scoring, and profile tests
- [x] Deterministic plan import browser acceptance
- [x] Statistics and adjustment approval browser acceptance
- [x] Profile settings and local JSON export
- [x] Versioned export boundary test
- [x] Graceful local-storage failure handling
- [x] Accessible names for all mobile bottom-navigation actions
- [x] Persisted review annotations and batch review action
- [x] Desktop student management and student-detail interaction
- [x] Desktop plan filtering and create-plan entry
- [x] Desktop expandable goal and milestone view
- [x] Desktop feedback center with review-state filtering
- [x] Desktop teacher settings with persisted local preferences
- [x] Responsive desktop management layouts and browser acceptance
- [x] Mobile assignment-feedback detail and revision flow
- [x] Mobile statistics weekly/monthly interaction
- [x] Mobile history calendar and daily record navigation
- [x] Mobile Personal Center entry points and local preferences
- [x] Student correction resubmission with original feedback retention
- [x] No paid or third-party AI API in the import pipeline
- [x] No force push or main-branch merge

## Production foundation

- [x] Select production backend direction: CloudBase hosting + PostgreSQL + private object storage
- [x] Define unified WeChat/Web identity mapping
- [x] Add API workspace, environment contract, health and readiness endpoints
- [x] Add relational schema and migration workflow

## Account-dependent release work

- [x] Provision the staging CloudBase environment, PostgreSQL instance, and private storage bucket
- [ ] Configure the staging API domain and identity settings
- [ ] Configure object storage and upload validation
- [ ] Configure notification provider and request user permission at runtime
- [ ] Configure public H5 domain, TLS, environment variables, and deployment pipeline
- [ ] Configure WeChat AppID, legal domains, privacy declarations, and submission metadata
- [ ] Verify H5 on current iOS Safari and Android Chrome devices
- [ ] Verify mini-program on at least one iOS and one Android WeChat device
- [ ] Run full screen-reader and keyboard-only accessibility audit on physical devices
- [ ] Run production API network interruption scenarios after the backend is selected
- [x] Handle local-storage write failures without losing the current screen
- [ ] Add privacy policy, terms, support contact, and account deletion endpoint
- [ ] Complete security and backup/restore review before public launch

## Known release note

The H5 entrypoint is approximately 300 KiB and triggers a non-blocking Webpack size warning. Route-level code splitting should be scheduled before a public traffic launch.
