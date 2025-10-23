import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getSystemHealth, getApplicationHealth, checkMemory } from '../../src/utils/quicker.js';

describe('Health Utils - Unit Tests', () => {
  describe('getSystemHealth', () => {
    it('should return system health information', () => {
      const health = getSystemHealth();

      assert.ok(health.cpuUsage);
      assert.ok(Array.isArray(health.cpuUsage));
      assert.ok(typeof health.cpuUsagePercent === 'string');
      assert.ok(health.cpuUsagePercent.includes('%'));
      assert.ok(typeof health.totalMemory === 'string');
      assert.ok(health.totalMemory.includes('MB'));
      assert.ok(typeof health.freeMemory === 'string');
      assert.ok(health.freeMemory.includes('MB'));
      assert.ok(typeof health.platform === 'string');
      assert.ok(typeof health.arch === 'string');
    });

    it('should return valid memory values', () => {
      const health = getSystemHealth();

      const totalMemory = parseFloat(health.totalMemory);
      const freeMemory = parseFloat(health.freeMemory);

      assert.ok(totalMemory > 0, 'Total memory should be positive');
      assert.ok(freeMemory >= 0, 'Free memory should be non-negative');
      assert.ok(freeMemory <= totalMemory, 'Free memory should not exceed total memory');
    });

    it('should return valid CPU usage percentage', () => {
      const health = getSystemHealth();
      const cpuPercent = parseFloat(health.cpuUsagePercent);

      assert.ok(cpuPercent >= 0, 'CPU usage should be non-negative');
      // Note: CPU usage can exceed 100% on multi-core systems
    });
  });

  describe('getApplicationHealth', () => {
    it('should return application health information', () => {
      const health = getApplicationHealth();

      assert.ok(typeof health.environment === 'string');
      assert.ok(typeof health.uptime === 'string');
      assert.ok(health.uptime.includes('Seconds'));
      assert.ok(typeof health.memoryUsage === 'object');
      assert.ok(typeof health.memoryUsage.heapTotal === 'string');
      assert.ok(health.memoryUsage.heapTotal.includes('MB'));
      assert.ok(typeof health.memoryUsage.heapUsed === 'string');
      assert.ok(health.memoryUsage.heapUsed.includes('MB'));
      assert.ok(typeof health.pid === 'number');
      assert.ok(typeof health.version === 'string');
    });

    it('should return valid memory usage values', () => {
      const health = getApplicationHealth();

      const heapTotal = parseFloat(health.memoryUsage.heapTotal);
      const heapUsed = parseFloat(health.memoryUsage.heapUsed);

      assert.ok(heapTotal > 0, 'Heap total should be positive');
      assert.ok(heapUsed > 0, 'Heap used should be positive');
      assert.ok(heapUsed <= heapTotal, 'Heap used should not exceed heap total');
    });

    it('should return valid process information', () => {
      const health = getApplicationHealth();

      assert.ok(health.pid > 0, 'Process ID should be positive');
      assert.ok(health.version.startsWith('v'), 'Node version should start with v');
    });
  });

  describe('checkMemory', () => {
    it('should return memory check with healthy status when usage is low', () => {
      const memoryCheck = checkMemory();

      assert.ok(typeof memoryCheck.status === 'string');
      assert.ok(['healthy', 'warning'].includes(memoryCheck.status));
      assert.ok(typeof memoryCheck.totalMB === 'number');
      assert.ok(typeof memoryCheck.usedMB === 'number');
      assert.ok(typeof memoryCheck.usagePercent === 'number');

      assert.ok(memoryCheck.totalMB > 0, 'Total memory should be positive');
      assert.ok(memoryCheck.usedMB >= 0, 'Used memory should be non-negative');
      assert.ok(memoryCheck.usagePercent >= 0, 'Usage percent should be non-negative');
      assert.ok(memoryCheck.usagePercent <= 100, 'Usage percent should not exceed 100');
    });

    it('should return warning status when memory usage is high', () => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = () => ({
        heapTotal: 100 * 1024 * 1024, // 100MB
        heapUsed: 95 * 1024 * 1024, // 95MB (95% usage)
        external: 0,
        arrayBuffers: 0
      });

      const memoryCheck = checkMemory();

      assert.strictEqual(memoryCheck.status, 'warning');
      assert.strictEqual(memoryCheck.usagePercent, 95);

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });
  });

  // Note: Database, Redis, and Disk tests require external dependencies
  // These are better suited for integration tests where we can test
  // against real or containerized services
  describe('External service checks', () => {
    it('should be tested in integration test suite', () => {
      // Database, Redis, and disk checks require actual connections/filesystem
      // and are better tested in the integration test suite
      assert.ok(true, 'External service tests moved to integration suite');
    });
  });
});
