# Using multistage builds for development environment
# Stage 1: Dependencies
FROM node:22-alpine AS deps

# Setting Up Working Directory
WORKDIR /usr/src/backend-app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Stage 2: Development
FROM node:22-alpine AS development

# Setting environment variable
ENV NODE_ENV=development

# Setting Up Working Directory
WORKDIR /usr/src/backend-app

# Copy dependencies from deps stage
COPY --from=deps /usr/src/backend-app/node_modules ./node_modules
COPY package*.json ./

# Copy the rest of the application code
COPY . .

# Exposing Port
EXPOSE 8000

# Start Application in development mode
CMD ["npm", "run", "dev"]