import { OpenFgaApi } from '@openfga/sdk';
import { logger } from '../utils/logger.js';
import { catchAsync } from '../utils/catchAsync.js';

let client = null;
let storeId = null;
export const connectOFGA = catchAsync(async () => {
  client = new OpenFgaApi({
    apiUrl: process.env.OPENFGA_API_URL,
    storeId: process.env.OPENFGA_STORE_ID,
    authorizationModelId: process.env.OPENFGA_MODEL_ID
  });

  // Create store if not exists
  if (!process.env.OPENFGA_STORE_ID) {
    await createStore();
  }

  logger.info('OpenFGA connected successfully');
  return client;
});

export const createStore = catchAsync(async () => {
  const response = await client.createStore({
    name: process.env.OPENFGA_STORE_NAME || 'auth-service-store'
  });

  storeId = response.id;
  logger.info(`OpenFGA store created: ${storeId}`);

  // Update client with store ID
  client = new OpenFgaApi({
    apiUrl: process.env.OPENFGA_API_URL,
    storeId
  });

  return storeId;
});
