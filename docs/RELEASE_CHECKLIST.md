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
- [x] No paid or third-party AI API in the import pipeline
- [x] No force push or main-branch merge

## Account-dependent release work

- [ ] Select production authentication and database providers
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
