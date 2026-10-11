# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS base
RUN corepack enable
WORKDIR /repo

# Recorta o monorepo para o que este app usa. O lockfile recortado (out/json) muda só
# quando as dependências mudam, então a camada de install fica em cache entre builds.
FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.11.7 prune @tech-challenge/anti-fraud --docker

FROM base AS build
COPY --from=prune /repo/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prune /repo/out/full/ .
RUN pnpm turbo run build --filter=@tech-challenge/anti-fraud
RUN pnpm --filter=@tech-challenge/anti-fraud deploy --prod /prod

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /prod .
USER node
EXPOSE 3002
CMD ["node", "dist/main.js"]
