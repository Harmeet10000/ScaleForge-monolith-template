import os from 'os';
import { redisClient } from '../db/connectRedis.js';
import mongoose from 'mongoose';

export const getSystemHealth = () => ({
  cpuUsage: os.loadavg(),
  cpuUsagePercent: `${((os.loadavg()[0] / os.cpus().length) * 100).toFixed(2)} + %`,
  totalMemory: `${(os.totalmem() / 1024 / 1024).toFixed(2)} MB`,
  freeMemory: `${(os.freemem() / 1024 / 1024).toFixed(2)} MB`,
  platform: os.platform(),
  arch: os.arch()
});

export const getApplicationHealth = () => ({
  environment: process.env.NODE_ENV,
  uptime: `${process.uptime().toFixed(2)} Seconds`,
  memoryUsage: {
    heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
  },
  pid: process.pid,
  version: process.version
});

export const checkDatabase = async () => {
  try {
    const state = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];

    if (state === 1) {
      // Test with a simple query
      await mongoose.connection.db.admin().ping();
      return {
        status: 'healthy',
        state: states[state],
        responseTime: Date.now()
      };
    }

    return {
      status: 'unhealthy',
      state: states[state],
      error: 'Database not connected'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

export const checkRedis = async () => {
  try {
    const start = Date.now();
    await redisClient.ping();
    const responseTime = Date.now() - start;

    return {
      status: 'healthy',
      responseTime,
      connection: redisClient.status
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      connection: redisClient.status
    };
  }
};

export const checkMemory = () => {
  const usage = process.memoryUsage();
  const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const usagePercent = Math.round((usage.heapUsed / usage.heapTotal) * 100);

  return {
    status: usagePercent < 90 ? 'healthy' : 'warning',
    totalMB,
    usedMB,
    usagePercent
  };
};

export const checkDisk = async () => {
  try {
    const fs = await import('fs/promises');
    const stats = await fs.stat('.');

    return {
      status: 'healthy',
      accessible: true
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};
