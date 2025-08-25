# Using multistage builds for development environment
# Stage 1: Dependencies
FROM node:22-alpine AS deps

# Enable pnpm
RUN corepack enable pnpm

# Setting Up Working Directory
WORKDIR /usr/src/backend-app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including dev dependencies)
RUN pnpm install --frozen-lockfile

# Stage 2: Development
FROM node:22-alpine AS development

# Enable pnpm
RUN corepack enable pnpm

# Setting Up Working Directory
WORKDIR /usr/src/backend-app

# Copy dependencies from deps stage
COPY --from=deps /usr/src/backend-app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./

# Copy the rest of the application code
COPY . .

# Copy .env files if they exist (optional for Railway compatibility)
COPY .env.development* ./

# Exposing Port
EXPOSE 8000

# Start Application in development mode
CMD ["pnpm", "run", "dev"]
