# One-off migrate + seed job. Build from the repo root: docker build -f packages/db/Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.11.10 prune @greenquote/seed --docker

FROM base AS install
COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile --ignore-scripts --prod
COPY --from=prune /app/out/full/ .

FROM node:22-alpine
WORKDIR /app
COPY --from=install --chown=node:node /app .
USER node
WORKDIR /app/packages
# npm ships with the node image and runs each package's own scripts.
CMD ["sh", "-c", "npm --prefix db run db:migrate && npm --prefix seed run db:seed"]
