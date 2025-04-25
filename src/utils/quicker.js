import os from 'os';

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
