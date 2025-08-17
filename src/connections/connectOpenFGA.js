import { CredentialsMethod, OpenFgaClient } from '@openfga/sdk';
import 'dotenv/config';
// who so ever is reading this please tell me if process.env is working beacuse the APIs dont work
// I have tried hard coding the values and it works
// process.env throws empty variable passed in client and  write/check calls
export const fgaClient = new OpenFgaClient({
  apiUrl: 'https://api.au1.fga.dev',
  storeId: '01K2CQ74ZEC8BXT52N5QJ3D7MJ',
  authorizationModelId: '01K2M2XK88QZ9H6797FM5QYVVZ',
  credentials: {
    method: CredentialsMethod.ClientCredentials,
    config: {
      apiTokenIssuer: 'auth.fga.dev',
      apiAudience: 'https://api.au1.fga.dev/',
      clientId: 'vXQcPdX3rvQtxujk9ycc2GjvtNjWkdQA',
      clientSecret: 'umXePzM94gAsZctE0lZvjoA15xbSYVcoqUum6yQGOAJfv0XKPWL8ynp8Ncd95thu'
    }
  }
});
// const { allowed } = await fgaClient.check({
//   user: 'user:harmeet',
//   relation: 'owner',
//   object: 'organization:org123'
// });
// console.log(allowed); // true or false based on the relationship
