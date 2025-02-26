# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install any needed dependencies
RUN npm ci

# Copy the rest of the application code to the working directory
COPY . .

# Expose a port
EXPOSE 3000

# Command to run the application
CMD [ "npm", "run", "dev" ]