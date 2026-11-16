# One-off migrate + seed job. Build from the repo root: docker build -f packages/db/Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.11.10 prune @greenquote/db --docker

FROM base AS install
COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY --from=prune /app/out/full/ .

FROM node:22-alpine
WORKDIR /app
COPY --from=install --chown=node:node /app .
USER node
WORKDIR /app/packages/db
CMD ["sh", "-c", "node_modules/.bin/tsx src/migrate.ts && node_modules/.bin/tsx src/seed.ts"]
