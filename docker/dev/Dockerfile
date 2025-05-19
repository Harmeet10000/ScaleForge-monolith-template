# Using multistage builds for development environment
# Stage 1: Dependencies
FROM node:22-alpine AS deps

# Install pnpm
RUN npm install -g pnpm

# Setting Up Working Directory
WORKDIR /usr/src/backend

# Copy package files
COPY package*.json pnpm-lock.yaml ./ 

# Install all dependencies using pnpm
RUN pnpm install --frozen-lockfile


# Stage 2: Development
FROM node:22-alpine AS development

# Install UPX
# RUN apk add --no-cache upx

# Compress the Node.js binary
# Note: This might take some time during the build due to --brute
# RUN upx --brute --quiet /usr/local/bin/node

# Setting environment variable
ENV NODE_ENV=development

# Setting Up Working Directory
WORKDIR /usr/src/backend

# Copy dependencies from deps stage
COPY --from=deps /usr/src/backend/node_modules ./node_modules
COPY package*.json ./

# Copy the rest of the application code
COPY . .

# Exposing Port
EXPOSE 8000

# Start Application in development mode
CMD ["npm", "run", "dev"]