# Build from the repo root: docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.11.10 prune api --docker

FROM base AS install
COPY --from=prune /app/out/json/ .
# The API runs its TypeScript source through @swc-node (a prod dependency), as in `pnpm dev`.
RUN pnpm install --frozen-lockfile --ignore-scripts --prod
COPY --from=prune /app/out/full/ .

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=install --chown=node:node /app .
USER node
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "--import", "@swc-node/register/esm-register", "src/main.ts"]
