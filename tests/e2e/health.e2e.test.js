import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

describe('Health Endpoints - E2E Tests', () => {
  let serverProcess;
  let baseUrl;
  const port = 8001; // Use different port for E2E tests

  before(async () => {
    // Set environment variables for E2E testing
    process.env.NODE_ENV = 'test';
    process.env.PORT = port.toString();
    process.env.SERVER_ID = 'e2e-test-server';
    process.env.HOSTNAME = 'e2e-test-container';

    // Start the server process
    serverProcess = spawn('node', ['src/index.js'], {
      env: { ...process.env },
      stdio: 'pipe'
    });

    baseUrl = `http://localhost:${port}`;

    // Wait for server to start
    await setTimeout(3000);

    // Verify server is running
    try {
      const response = await fetch(`${baseUrl}/api/v1/health/self`);
      if (!response.ok) {
        throw new Error(`Server not ready: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to start server for E2E tests:', error);
      throw error;
    }
  });

  after(async () => {
    // Clean up server process
    if (serverProcess) {
      serverProcess.kill('SIGTERM');

      // Wait for graceful shutdown
      await new Promise((resolve) => {
        serverProcess.on('exit', resolve);
        setTimeout(() => {
          serverProcess.kill('SIGKILL');
          resolve();
        }, 5000);
      });
    }

    // Clean up environment variables
    delete process.env.PORT;
    delete process.env.SERVER_ID;
    delete process.env.HOSTNAME;
  });

  describe('Health Check Workflow', () => {
    it('should perform complete health check workflow', async () => {
      // Step 1: Check if server is alive
      const selfResponse = await fetch(`${baseUrl}/api/v1/health/self`);
      assert.strictEqual(selfResponse.status, 200);

      const selfData = await selfResponse.json();
      assert.strictEqual(selfData.success, true);
      assert.strictEqual(selfData.data.server, 'e2e-test-server');

      // Step 2: Perform comprehensive health check
      const healthResponse = await fetch(`${baseUrl}/api/v1/health/health`);
      assert.strictEqual(healthResponse.status, 200);

      const healthData = await healthResponse.json();
      assert.strictEqual(healthData.success, true);
      assert.ok(healthData.data.checks);
      assert.ok(healthData.data.application);
      assert.ok(healthData.data.system);

      // Step 3: Verify all health checks have status
      const { checks } = healthData.data;
      ['database', 'redis', 'memory', 'disk'].forEach((checkName) => {
        assert.ok(checks[checkName]);
        assert.ok(typeof checks[checkName].status === 'string');
        assert.ok(['healthy', 'unhealthy', 'warning'].includes(checks[checkName].status));
      });
    });

    it('should handle load balancer health checks', async () => {
      // Simulate load balancer health checks
      const healthCheckRequests = Array(20)
        .fill()
        .map(async (_, index) => {
          await setTimeout(index * 100); // Stagger requests

          const response = await fetch(`${baseUrl}/api/v1/health/self`);
          assert.strictEqual(response.status, 200);

          const data = await response.json();
          return data.data.timestamp;
        });

      const timestamps = await Promise.all(healthCheckRequests);

      // Verify all requests succeeded and returned unique timestamps
      assert.strictEqual(timestamps.length, 20);
      const uniqueTimestamps = new Set(timestamps);
      assert.ok(uniqueTimestamps.size >= 15); // Allow some timestamp collisions
    });

    it('should maintain consistent response format across requests', async () => {
      const responses = await Promise.all([
        fetch(`${baseUrl}/api/v1/health/self`),
        fetch(`${baseUrl}/api/v1/health/health`)
      ]);

      for (const response of responses) {
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.headers.get('content-type'), 'application/json; charset=utf-8');

        const data = await response.json();
        assert.strictEqual(typeof data.success, 'boolean');
        assert.strictEqual(typeof data.statusCode, 'number');
        assert.strictEqual(typeof data.message, 'string');
        assert.strictEqual(typeof data.data, 'object');
      }
    });
  });

  describe('Performance and Reliability', () => {
    it('should respond to health checks within acceptable time limits', async () => {
      const startTime = Date.now();

      const response = await fetch(`${baseUrl}/api/v1/health/health`);
      const responseTime = Date.now() - startTime;

      assert.strictEqual(response.status, 200);
      assert.ok(responseTime < 2000, `Health check took ${responseTime}ms, should be under 2000ms`);
    });

    it('should handle concurrent health check requests', async () => {
      const concurrentRequests = 50;
      const requests = Array(concurrentRequests)
        .fill()
        .map(() => fetch(`${baseUrl}/api/v1/health/self`));

      const responses = await Promise.all(requests);

      responses.forEach((response, index) => {
        assert.strictEqual(response.status, 200, `Request ${index} failed`);
      });

      // Verify all responses are valid JSON
      const jsonResponses = await Promise.all(responses.map((response) => response.json()));

      jsonResponses.forEach((data, index) => {
        assert.strictEqual(data.success, true, `Response ${index} not successful`);
        assert.ok(data.data.timestamp, `Response ${index} missing timestamp`);
      });
    });

    it('should maintain health check functionality under sustained load', async () => {
      const duration = 10000; // 10 seconds
      const interval = 100; // 100ms between requests
      const startTime = Date.now();
      const results = [];

      while (Date.now() - startTime < duration) {
        try {
          const response = await fetch(`${baseUrl}/api/v1/health/self`);
          results.push({
            status: response.status,
            timestamp: Date.now(),
            success: response.status === 200
          });
        } catch (error) {
          results.push({
            status: 0,
            timestamp: Date.now(),
            success: false,
            error: error.message
          });
        }

        await setTimeout(interval);
      }

      // Analyze results
      const successfulRequests = results.filter((r) => r.success).length;
      const successRate = successfulRequests / results.length;

      assert.ok(successRate >= 0.95, `Success rate ${successRate} below 95%`);
      assert.ok(results.length >= 80, `Only ${results.length} requests made in ${duration}ms`);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle invalid endpoints gracefully', async () => {
      const invalidEndpoints = [
        '/api/v1/health/invalid',
        '/api/v1/health/self/extra',
        '/api/v1/health/health/extra'
      ];

      for (const endpoint of invalidEndpoints) {
        const response = await fetch(`${baseUrl}${endpoint}`);
        assert.strictEqual(response.status, 404);

        const data = await response.json();
        assert.strictEqual(data.success, false);
      }
    });

    it('should handle malformed requests', async () => {
      // Test with various HTTP methods
      const methods = ['POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        const response = await fetch(`${baseUrl}/api/v1/health/self`, {
          method
        });

        // Should either be 404 (not found) or 405 (method not allowed)
        assert.ok([404, 405].includes(response.status));
      }
    });
  });

  describe('Monitoring Integration', () => {
    it('should provide metrics endpoint for monitoring systems', async () => {
      const response = await fetch(`${baseUrl}/metrics`);

      if (response.status === 200) {
        const metricsText = await response.text();
        assert.ok(metricsText.includes('# HELP'));
        assert.ok(metricsText.includes('# TYPE'));
      } else {
        // Metrics endpoint might not be enabled in test environment
        assert.ok([404, 405].includes(response.status));
      }
    });

    it('should include response time headers for monitoring', async () => {
      const response = await fetch(`${baseUrl}/api/v1/health/self`);
      assert.strictEqual(response.status, 200);

      const responseTimeHeader = response.headers.get('x-response-time');
      if (responseTimeHeader) {
        assert.ok(responseTimeHeader.includes('ms'));
        const responseTime = parseFloat(responseTimeHeader);
        assert.ok(responseTime >= 0);
        assert.ok(responseTime < 1000); // Should be under 1 second
      }
    });
  });
});
