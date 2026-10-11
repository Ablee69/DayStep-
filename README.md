# DayStep V6.0

Cross-platform goal planning and execution platform. Phase A currently contains six interactive UI prototypes backed by typed local fixtures.

## Requirements

- Node.js 22 or newer
- pnpm 11 or newer

## Install

```bash
pnpm install
```

## Local development

Run both applications:

```bash
pnpm dev
```

- Teacher dashboard: `http://127.0.0.1:4173`
- Mobile H5: `http://127.0.0.1:4174`

Run one application:

```bash
pnpm dev:dashboard
pnpm dev:mobile
```

## Verification

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @daystep/mobile build:weapp
```

H5 output is written to `apps/mobile/dist/h5`; the WeChat mini-program output is written to `apps/mobile/dist/weapp`.

## Current limitations

Phase A uses clearly scoped local fixture data. Authentication, cloud persistence, AI service calls, uploads, grading persistence, and authorization enforcement belong to later phases and are not represented as complete.

