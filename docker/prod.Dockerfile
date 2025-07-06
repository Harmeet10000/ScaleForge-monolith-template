# Production-ready Dockerfile with multistage build
# Stage 1: Dependencies and Build
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies required for build
RUN apk add --no-cache python3 make g++

# Install dependencies first (caching)
COPY package*.json ./
# Only install production dependencies
RUN npm ci 

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine AS runtime

# Runtime labels - following OCI image spec
LABEL org.opencontainers.image.source="https://github.com/harmeet10000/production-grade-auth-template"
LABEL org.opencontainers.image.description="Production-ready authentication service"
LABEL org.opencontainers.image.licenses="ISC"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="Harmeet Singh"

# Set working directory
WORKDIR /app

# Create a non-root user and set permissions
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN mkdir -p /app/logs /app/backups && chown -R appuser:appgroup /app

# Create directory for node_modules/.cache to avoid permission issues
RUN mkdir -p /home/appuser/.cache && chown -R appuser:appgroup /home/appuser

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8000
ENV TZ=UTC

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy build artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Copy necessary files for runtime
COPY --chown=appuser:appgroup ./scripts ./scripts
COPY --chown=appuser:appgroup ./swagger.json ./swagger.json
COPY --chown=appuser:appgroup ./.env.production ./.env.production

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); const options = { hostname: 'localhost', port: process.env.PORT || 8000, path: '/api/health', timeout: 2000 }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => { process.exit(1); }); req.end();"

# Expose port
EXPOSE 8000

# Switch to non-root user
USER appuser

# Docker startup script
CMD ["node", "dist/index.cjs"]