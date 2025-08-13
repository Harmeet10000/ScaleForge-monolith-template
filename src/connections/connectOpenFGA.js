import { OpenFgaApi } from '@openfga/sdk';

export const fgaClient = new OpenFgaApi({
  apiScheme: 'https',
  apiHost: process.env.OPENFGA_API_HOST,
  apiUrl: process.env.OPENFGA_API_URL,
  storeId: process.env.OPENFGA_STORE_ID,
  authorizationModelId: process.env.OPENFGA_MODEL_ID
});

// const createStore = catchAsync(async () => {
//   const response = await client.createStore({
//     name: process.env.OPENFGA_STORE_NAME || 'auth-service-store'
//   });

//   storeId = response.id;
//   logger.info(`OpenFGA store created: ${storeId}`);

//   // Update client with store ID
//   client = new OpenFgaApi({
//     apiUrl: process.env.OPENFGA_API_URL,
//     storeId
//   });

//   return storeId;
// });
