# Production Dockerfile using Bun
FROM oven/bun:1.3.8-alpine AS builder

WORKDIR /usr/src/backend-app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

# Production runtime
FROM oven/bun:1.3.8-alpine AS runtime

LABEL org.opencontainers.image.source="https://github.com/harmeet10000/production-grade-auth-template"
LABEL org.opencontainers.image.description="Production-ready authentication service"
LABEL org.opencontainers.image.licenses="ISC"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="Harmeet Singh"

WORKDIR /usr/src/backend-app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN mkdir -p /usr/src/backend-app/logs /usr/src/backend-app/backups && chown -R appuser:appgroup /usr/src/backend-app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --production

COPY --from=builder --chown=appuser:appgroup /usr/src/backend-app/dist ./dist

COPY --chown=appuser:appgroup ./scripts ./scripts
COPY --chown=appuser:appgroup ./swagger.json ./swagger.json

EXPOSE 8000

USER appuser

CMD ["bun", "dist/index.js"]
