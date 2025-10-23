import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../../src/app.js';

describe('Health Endpoints - Integration Tests', () => {
  let server;

  before(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.SERVER_ID = 'test-server-integration';
    process.env.HOSTNAME = 'test-container-integration';

    // Start the server
    const port = process.env.TEST_PORT || 0; // Use random port for testing
    server = app.listen(port);
  });

  after(async () => {
    // Clean up
    if (server) {
      server.close();
    }

    // Clean up environment variables
    delete process.env.SERVER_ID;
    delete process.env.HOSTNAME;
  });

  beforeEach(() => {
    // Reset any state between tests if needed
  });

  describe('GET /api/v1/health/self', () => {
    it('should return 200 and server information', async () => {
      const response = await request(app).get('/api/v1/health/self').expect(200);

      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.statusCode, 200);
      assert.ok(response.body.data);

      const { data } = response.body;
      assert.strictEqual(data.server, 'test-server-integration');
      assert.strictEqual(data.container, 'test-container-integration');
      assert.ok(data.timestamp);

      // Verify timestamp is valid ISO string
      const timestamp = new Date(data.timestamp);
      assert.ok(timestamp.getTime() > 0);
      assert.ok(Math.abs(Date.now() - timestamp.getTime()) < 5000); // Within 5 seconds
    });

    it('should return consistent response structure', async () => {
      const response = await request(app).get('/api/v1/health/self').expect(200);

      // Verify response structure
      assert.ok(typeof response.body.success === 'boolean');
      assert.ok(typeof response.body.statusCode === 'number');
      assert.ok(typeof response.body.message === 'string');
      assert.ok(typeof response.body.data === 'object');

      // Verify data structure
      const { data } = response.body;
      assert.ok(typeof data.server === 'string');
      assert.ok(typeof data.container === 'string');
      assert.ok(typeof data.timestamp === 'string');
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array(10)
        .fill()
        .map(() => request(app).get('/api/v1/health/self').expect(200));

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        assert.strictEqual(response.body.success, true);
        assert.strictEqual(response.body.statusCode, 200);
        assert.ok(response.body.data.timestamp);
      });
    });

    it('should return appropriate headers', async () => {
      const response = await request(app).get('/api/v1/health/self').expect(200);

      assert.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8');
      assert.ok(response.headers['x-response-time']);
    });
  });

  describe('GET /api/v1/health/health', () => {
    it('should return 200 and comprehensive health data', async () => {
      const response = await request(app).get('/api/v1/health/health').expect(200);

      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.statusCode, 200);
      assert.ok(response.body.data);

      const { data } = response.body;

      // Verify main structure
      assert.ok(data.application);
      assert.ok(data.system);
      assert.ok(data.checks);
      assert.ok(data.timestamp);

      // Verify checks structure
      assert.ok(data.checks.database);
      assert.ok(data.checks.redis);
      assert.ok(data.checks.memory);
      assert.ok(data.checks.disk);

      // Verify each check has status
      Object.values(data.checks).forEach((check) => {
        assert.ok(typeof check.status === 'string');
        assert.ok(['healthy', 'unhealthy', 'warning'].includes(check.status));
      });
    });

    it('should return valid application health data', async () => {
      const response = await request(app).get('/api/v1/health/health').expect(200);

      const appHealth = response.body.data.application;

      assert.ok(typeof appHealth.environment === 'string');
      assert.ok(typeof appHealth.uptime === 'string');
      assert.ok(appHealth.uptime.includes('Seconds'));
      assert.ok(typeof appHealth.memoryUsage === 'object');
      assert.ok(typeof appHealth.memoryUsage.heapTotal === 'string');
      assert.ok(typeof appHealth.memoryUsage.heapUsed === 'string');
      assert.ok(typeof appHealth.pid === 'number');
      assert.ok(typeof appHealth.version === 'string');
    });

    it('should return valid system health data', async () => {
      const response = await request(app).get('/api/v1/health/health').expect(200);

      const sysHealth = response.body.data.system;

      assert.ok(Array.isArray(sysHealth.cpuUsage));
      assert.ok(typeof sysHealth.cpuUsagePercent === 'string');
      assert.ok(sysHealth.cpuUsagePercent.includes('%'));
      assert.ok(typeof sysHealth.totalMemory === 'string');
      assert.ok(sysHealth.totalMemory.includes('MB'));
      assert.ok(typeof sysHealth.freeMemory === 'string');
      assert.ok(sysHealth.freeMemory.includes('MB'));
      assert.ok(typeof sysHealth.platform === 'string');
      assert.ok(typeof sysHealth.arch === 'string');
    });

    it('should return memory check with valid data', async () => {
      const response = await request(app).get('/api/v1/health/health').expect(200);

      const memoryCheck = response.body.data.checks.memory;

      assert.ok(['healthy', 'warning'].includes(memoryCheck.status));
      assert.ok(typeof memoryCheck.totalMB === 'number');
      assert.ok(typeof memoryCheck.usedMB === 'number');
      assert.ok(typeof memoryCheck.usagePercent === 'number');

      assert.ok(memoryCheck.totalMB > 0);
      assert.ok(memoryCheck.usedMB >= 0);
      assert.ok(memoryCheck.usagePercent >= 0);
      assert.ok(memoryCheck.usagePercent <= 100);
    });

    it('should return disk check with accessibility status', async () => {
      const response = await request(app).get('/api/v1/health/health').expect(200);

      const diskCheck = response.body.data.checks.disk;

      assert.ok(['healthy', 'unhealthy'].includes(diskCheck.status));

      if (diskCheck.status === 'healthy') {
        assert.strictEqual(diskCheck.accessible, true);
      } else {
        assert.ok(typeof diskCheck.error === 'string');
      }
    });

    it('should handle health check timeouts gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/health/health')
        .timeout(10000) // 10 second timeout
        .expect(200);

      assert.strictEqual(response.body.success, true);
      assert.ok(response.body.data.timestamp);
    });

    it('should return consistent response times', async () => {
      const startTime = Date.now();

      await request(app).get('/api/v1/health/health').expect(200);

      const responseTime = Date.now() - startTime;

      // Health check should complete within reasonable time
      assert.ok(responseTime < 5000, `Health check took ${responseTime}ms, should be under 5000ms`);
    });
  });

  describe('Error handling', () => {
    it('should return 404 for non-existent health endpoints', async () => {
      await request(app).get('/api/v1/health/nonexistent').expect(404);
    });

    it('should handle malformed requests gracefully', async () => {
      await request(app).get('/api/v1/health/self?invalid=param').expect(200); // Should still work with query params
    });
  });
});
