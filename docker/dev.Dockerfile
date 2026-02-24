# Development Dockerfile using Bun
FROM oven/bun:1.3.8-alpine AS base

WORKDIR /usr/src/backend-app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

# Development stage
FROM base AS development

COPY . .

EXPOSE 8000

CMD ["bun", "run", "dev"]
