# DayStep V6.2

Cross-platform goal planning and execution platform. Phase A provides six interactive UI screens; Phase B-D adds canonical workspace data, deterministic zero-AI plan import, and permission-aware teacher/student workflows.

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

## Plan import

The deterministic import format is documented in [`docs/PLAN_IMPORT.md`](docs/PLAN_IMPORT.md), with a ready-to-use template in [`examples/plan-import-template.md`](examples/plan-import-template.md) and the versioned JSON Schema in [`schemas/daystep-plan.v1.schema.json`](schemas/daystep-plan.v1.schema.json).

## Current limitations

The domain service and permission model run locally without external credentials. Production cloud persistence, identity-provider configuration, object storage, email delivery, and deployment still require environment-specific adapters and credentials; they are not represented as connected.

