# DayStep Production Architecture

## Decision

DayStep will use a provider-contained API architecture:

- Node.js API service deployed to Tencent CloudBase cloud hosting.
- CloudBase PostgreSQL as the canonical relational database.
- Private Tencent COS or CloudBase storage for user attachments.
- CloudBase/WeChat identity for mini-program users and a Web identity adapter for H5 and desktop users.
- A DayStep user record links all external identities so one person does not receive separate data silos.

Clients never connect directly to PostgreSQL and never receive permanent storage credentials. The API owns authorization, transactions, idempotency, audit logging, signed upload creation, and schema validation.

## Why this stack

The product must serve WeChat mini-program, mobile H5, and desktop Web users in mainland China and Taiwan. CloudBase provides native WeChat integration and Web/backend hosting, while PostgreSQL preserves the canonical relational hierarchy and permission boundaries already defined by the domain package. Provider details stay behind adapters so deployment can move without rewriting product logic.

## Trust boundaries

1. Clients present a short-lived platform identity token to the API.
2. The auth adapter maps the external identity to `users` and `auth_identities`.
3. Every business operation resolves a workspace membership before reading or writing data.
4. Uploads use short-lived, object-specific signed URLs; attachments remain private.
5. Import confirmation, submissions, reviews, and repeated task generation use database transactions and idempotency keys.
6. Security-relevant writes append immutable audit events.

## Environments

- Local: API health checks run without cloud credentials; PostgreSQL can be supplied through `DATABASE_URL`.
- Staging: separate CloudBase environment, database, bucket, domain, and WeChat test configuration.
- Production: isolated resources, managed secrets, backups, monitoring, and least-privilege service accounts.

No real secret belongs in Git. Copy `apps/api/.env.example` to an ignored local environment file only after cloud resources exist.
