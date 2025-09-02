import { httpResponse } from '../../utils/httpResponse.js';
import {
  checkDatabase,
  checkDisk,
  checkMemory,
  checkRedis,
  getApplicationHealth,
  getSystemHealth
} from '../../utils/quicker.js';
import asyncHandler from 'express-async-handler';
import { SUCCESS } from '../auth/authConstants.js';

export const self = (req, res) => {
  const serverInfo = {
    server: process.env.SERVER_ID || 'unknown',
    container: process.env.HOSTNAME || 'unknown',
    timestamp: new Date().toISOString()
  };
  httpResponse(req, res, 200, SUCCESS, serverInfo);
};

export const health = asyncHandler(async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    memory: checkMemory(),
    disk: await checkDisk()
  };
  const healthData = {
    application: getApplicationHealth(),
    system: getSystemHealth(),
    timestamp: new Date().toISOString(),
    checks
  };

  httpResponse(req, res, 200, SUCCESS, healthData);
});
