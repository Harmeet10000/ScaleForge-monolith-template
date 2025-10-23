/**
 * Test fixtures for health-related tests
 * Provides consistent test data and mock responses
 */

export const healthFixtures = {
  // Mock system health data
  systemHealth: {
    cpuUsage: [0.5, 0.3, 0.2],
    cpuUsagePercent: '25.50 %',
    totalMemory: '8192.00 MB',
    freeMemory: '4096.00 MB',
    platform: 'linux',
    arch: 'x64'
  },

  // Mock application health data
  applicationHealth: {
    environment: 'test',
    uptime: '123.45 Seconds',
    memoryUsage: {
      heapTotal: '256.00 MB',
      heapUsed: '128.00 MB'
    },
    pid: 12345,
    version: 'v22.0.0'
  },

  // Mock database check responses
  databaseChecks: {
    healthy: {
      status: 'healthy',
      state: 'connected',
      responseTime: 15
    },
    unhealthy: {
      status: 'unhealthy',
      state: 'disconnected',
      error: 'Database not connected'
    },
    timeout: {
      status: 'unhealthy',
      error: 'Connection timeout'
    }
  },

  // Mock Redis check responses
  redisChecks: {
    healthy: {
      status: 'healthy',
      responseTime: 5,
      connection: 'ready'
    },
    unhealthy: {
      status: 'unhealthy',
      error: 'Redis connection failed',
      connection: 'disconnected'
    }
  },

  // Mock memory check responses
  memoryChecks: {
    healthy: {
      status: 'healthy',
      totalMB: 256,
      usedMB: 128,
      usagePercent: 50
    },
    warning: {
      status: 'warning',
      totalMB: 256,
      usedMB: 230,
      usagePercent: 90
    },
    critical: {
      status: 'warning',
      totalMB: 256,
      usedMB: 250,
      usagePercent: 98
    }
  },

  // Mock disk check responses
  diskChecks: {
    healthy: {
      status: 'healthy',
      accessible: true
    },
    unhealthy: {
      status: 'unhealthy',
      error: 'Permission denied'
    }
  },

  // Complete health response fixtures
  completeHealthResponse: {
    healthy: {
      application: {
        environment: 'test',
        uptime: '123.45 Seconds',
        memoryUsage: {
          heapTotal: '256.00 MB',
          heapUsed: '128.00 MB'
        },
        pid: 12345,
        version: 'v22.0.0'
      },
      system: {
        cpuUsage: [0.5, 0.3, 0.2],
        cpuUsagePercent: '25.50 %',
        totalMemory: '8192.00 MB',
        freeMemory: '4096.00 MB',
        platform: 'linux',
        arch: 'x64'
      },
      checks: {
        database: {
          status: 'healthy',
          state: 'connected',
          responseTime: 15
        },
        redis: {
          status: 'healthy',
          responseTime: 5,
          connection: 'ready'
        },
        memory: {
          status: 'healthy',
          totalMB: 256,
          usedMB: 128,
          usagePercent: 50
        },
        disk: {
          status: 'healthy',
          accessible: true
        }
      },
      timestamp: '2024-01-01T12:00:00.000Z'
    },

    partiallyUnhealthy: {
      application: {
        environment: 'test',
        uptime: '123.45 Seconds',
        memoryUsage: {
          heapTotal: '256.00 MB',
          heapUsed: '128.00 MB'
        },
        pid: 12345,
        version: 'v22.0.0'
      },
      system: {
        cpuUsage: [0.5, 0.3, 0.2],
        cpuUsagePercent: '25.50 %',
        totalMemory: '8192.00 MB',
        freeMemory: '4096.00 MB',
        platform: 'linux',
        arch: 'x64'
      },
      checks: {
        database: {
          status: 'unhealthy',
          state: 'disconnected',
          error: 'Database not connected'
        },
        redis: {
          status: 'healthy',
          responseTime: 5,
          connection: 'ready'
        },
        memory: {
          status: 'warning',
          totalMB: 256,
          usedMB: 230,
          usagePercent: 90
        },
        disk: {
          status: 'healthy',
          accessible: true
        }
      },
      timestamp: '2024-01-01T12:00:00.000Z'
    }
  },

  // Self endpoint response fixtures
  selfResponse: {
    default: {
      server: 'test-server-1',
      container: 'test-container',
      timestamp: '2024-01-01T12:00:00.000Z'
    },
    unknown: {
      server: 'unknown',
      container: 'unknown',
      timestamp: '2024-01-01T12:00:00.000Z'
    }
  }
};

// Helper functions for creating test data
export const createHealthResponse = (overrides = {}) => ({
  success: true,
  statusCode: 200,
  message: 'Success',
  data: {
    ...healthFixtures.completeHealthResponse.healthy,
    ...overrides
  }
});

export const createSelfResponse = (overrides = {}) => ({
  success: true,
  statusCode: 200,
  message: 'Success',
  data: {
    ...healthFixtures.selfResponse.default,
    ...overrides
  }
});

export const createErrorResponse = (statusCode = 500, message = 'Internal Server Error') => ({
  success: false,
  statusCode,
  message,
  data: null
});

// Mock environment configurations
export const testEnvironments = {
  development: {
    NODE_ENV: 'development',
    SERVER_ID: 'dev-server-1',
    HOSTNAME: 'dev-container',
    LOG_LEVEL: 'debug'
  },
  test: {
    NODE_ENV: 'test',
    SERVER_ID: 'test-server-1',
    HOSTNAME: 'test-container',
    LOG_LEVEL: 'error'
  },
  production: {
    NODE_ENV: 'production',
    SERVER_ID: 'prod-server-1',
    HOSTNAME: 'prod-container',
    LOG_LEVEL: 'info'
  }
};

export default healthFixtures;
