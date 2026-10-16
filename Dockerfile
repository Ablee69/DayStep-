FROM node:22-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8787

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/design-tokens/package.json packages/design-tokens/package.json
RUN pnpm install --frozen-lockfile

COPY apps/api apps/api
COPY packages/domain packages/domain
COPY packages/design-tokens packages/design-tokens
RUN pnpm --filter @daystep/domain build && pnpm --filter @daystep/api build

EXPOSE 8787

CMD ["node", "apps/api/dist/server.js"]
