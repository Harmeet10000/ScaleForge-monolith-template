import { httpResponse } from '../utils/httpResponse.js';
import {
  checkDatabase,
  checkDisk,
  checkMemory,
  checkRedis,
  getApplicationHealth,
  getSystemHealth
} from '../utils/quicker.js';
import { SUCCESS } from '../constants/responseMessage.js';
import { catchAsync } from '../utils/catchAsync.js';

export const self = (req, res) => {
  httpResponse(req, res, 200, SUCCESS);
};

export const health = catchAsync(async (req, res) => {
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
