import { Request, Response } from 'express';
import { httpResponse } from '../utils/httpResponse.js';
import { getApplicationHealth, getSystemHealth } from '../utils/quicker.js';
import { SUCCESS } from '../constant/responseMessage.js';

export const self = (req: Request, res: Response) => {
  httpResponse(req, res, 200, SUCCESS);
};

export const health = (req: Request, res: Response) => {
  const healthData = {
    application: getApplicationHealth(),
    system: getSystemHealth(),
    timestamp: Date.now()
  };

  httpResponse(req, res, 200, SUCCESS, healthData);
};
