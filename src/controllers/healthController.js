import { httpResponse } from '../utils/httpResponse.js';
import { getApplicationHealth, getSystemHealth } from '../utils/quicker.js';
import { SUCCESS } from '../constant/responseMessage.js';
import { catchAsync } from '../utils/catchAsync.js';

export const self = catchAsync((req, res) => {
  httpResponse(req, res, 200, SUCCESS);
});

export const health = catchAsync((req, res) => {
  const healthData = {
    application: getApplicationHealth(),
    system: getSystemHealth(),
    timestamp: Date.now()
  };

  httpResponse(req, res, 200, SUCCESS, healthData);
});
