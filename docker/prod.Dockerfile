# Production-ready Dockerfile with multistage build
# Stage 1: Dependencies and Build

FROM node:22-alpine AS builder

# Enable pnpm
RUN corepack enable pnpm

# Set working directory
WORKDIR /usr/src/backend-app

# Install dependencies first (caching)
COPY package.json pnpm-lock.yaml ./
# Only install production dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build the application
RUN pnpm run build

# Stage 2: Runtime

FROM node:22-alpine AS runtime

# Enable pnpm
RUN corepack enable pnpm

# Runtime labels - following OCI image spec
LABEL org.opencontainers.image.source="https://github.com/harmeet10000/production-grade-auth-template"
LABEL org.opencontainers.image.description="Production-ready authentication service"
LABEL org.opencontainers.image.licenses="ISC"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="Harmeet Singh"

# Set working directory
WORKDIR /usr/src/backend-app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN mkdir -p /usr/src/backend-app/logs /usr/src/backend-app/backups && chown -R appuser:appgroup /usr/src/backend-app

RUN mkdir -p /home/appuser/.cache && chown -R appuser:appgroup /home/appuser

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod && pnpm store prune

COPY --from=builder /usr/src/backend-app/dist ./dist

COPY --chown=appuser:appgroup ./scripts ./scripts
COPY --chown=appuser:appgroup ./swagger.json ./swagger.json
# Note: .env files are not copied in production - use environment variables instead

EXPOSE 8000

USER appuser

CMD ["node", "dist/index.cjs"]
