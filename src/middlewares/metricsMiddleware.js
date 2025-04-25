import { metrics } from '../utils/metrics/metricsHelper.js';

/**
 * Middleware to track HTTP request duration and count
 */
export const trackRequestMetrics = (req, res, next) => {
  // Store start time on the request object
  req.startTime = Date.now();

  // Track when request completes
  res.on('finish', () => {
    metrics.trackRequestDuration(req, res, req.startTime);
  });

  next();
};

/**
 * Middleware to track active connections
 */
export const trackConnections = () => {
  // Initial connection count
  let connections = 0;

  return (req, res, next) => {
    // Increment counter on new connection
    connections++;
    metrics.activeConnections.set(connections);

    // Decrement when connection closes
    res.on('close', () => {
      connections = Math.max(0, connections - 1); // Ensure we don't go negative
      metrics.activeConnections.set(connections);
    });

    next();
  };
};

/**
 * Middleware to track authentication failures
 * Use in auth middleware/controllers
 */
export const trackAuthFailure = (reason) => {
  metrics.trackAuthFailure(reason);
};
