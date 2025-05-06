import { Request, Response } from 'express';
import { httpResponse } from '../utils/httpResponse.js';
import { getApplicationHealth, getSystemHealth } from '../utils/quicker.js';
import { SUCCESS } from '../constant/responseMessage.js';
import { catchAsync } from '../utils/catchAsync.js';
import { NextFunction } from 'express';

export const self = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  httpResponse(req, res, 200, SUCCESS);
});

export const health = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const healthData = {
    application: getApplicationHealth(),
    system: getSystemHealth(),
    timestamp: Date.now()
  };

  httpResponse(req, res, 200, SUCCESS, healthData);
});