import client from 'prom-client';
import { logger } from '../logger.js';

// Create a custom registry to avoid conflicts with express-prom-bundle
export const customRegistry = new client.Registry();

// Counters
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [customRegistry]
});

const authFailureCounter = new client.Counter({
  name: 'auth_failures_total',
  help: 'Total authentication failures',
  labelNames: ['reason'],
  registers: [customRegistry]
});

// Histograms
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10], // in seconds
  registers: [customRegistry]
});

// Gauges
const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [customRegistry]
});

// DB connection status (0 = disconnected, 1 = connected)
const dbConnectionStatus = new client.Gauge({
  name: 'db_connection_status',
  help: 'Database connection status (0 = disconnected, 1 = connected)',
  registers: [customRegistry]
});

// Redis connection status (0 = disconnected, 1 = connected)
const redisConnectionStatus = new client.Gauge({
  name: 'redis_connection_status',
  help: 'Redis connection status (0 = disconnected, 1 = connected)',
  registers: [customRegistry]
});

export const metrics = {
  httpRequestCounter,
  authFailureCounter,
  httpRequestDuration,
  activeConnections,
  dbConnectionStatus,
  redisConnectionStatus,

  // Helper method to time and record HTTP request duration
  trackRequestDuration: (req, res, startTime) => {
    try {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      const path = req.route?.path || req.path || 'unknown';
      httpRequestDuration.labels(req.method, path, res.statusCode).observe(duration);
      httpRequestCounter.labels(req.method, path, res.statusCode).inc();
    } catch (error) {
      logger.error('Error tracking request metrics', { error: error.message, path: req.path });
    }
  },

  // Set DB connection status
  setDbConnected: (isConnected) => {
    try {
      dbConnectionStatus.set(isConnected ? 1 : 0);
      logger.debug(`DB connection status set to ${isConnected ? 'connected' : 'disconnected'}`);
    } catch (error) {
      logger.error('Error setting DB connection status metric', { error: error.message });
    }
  },

  // Set Redis connection status
  setRedisConnected: (isConnected) => {
    try {
      redisConnectionStatus.set(isConnected ? 1 : 0);
      logger.debug(`Redis connection status set to ${isConnected ? 'connected' : 'disconnected'}`);
    } catch (error) {
      logger.error('Error setting Redis connection status metric', { error: error.message });
    }
  },

  // Track authentication failure with reason
  trackAuthFailure: (reason) => {
    try {
      authFailureCounter.labels(reason || 'unknown').inc();
      logger.debug(`Auth failure tracked: ${reason || 'unknown'}`);
    } catch (error) {
      logger.error('Error tracking auth failure metric', { error: error.message });
    }
  },

  // Get the metrics registry for the /metrics endpoint
  getMetricsRegistry: () => customRegistry
};
