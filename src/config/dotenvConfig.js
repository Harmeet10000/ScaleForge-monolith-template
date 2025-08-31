import dotenvFlow from 'dotenv-flow';

// Configure dotenv-flow with Railway-compatible options
dotenvFlow.config({
  // Look for .env files in the current working directory
  path: process.cwd(),
  // Set default NODE_ENV if not provided
  default_node_env: 'development',
  // Don't fail if .env files are missing (useful for Railway and production)
  silent: true,
  // Don't override existing environment variables (Railway sets these)
  override: false
});
