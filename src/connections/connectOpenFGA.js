import { CredentialsMethod, OpenFgaClient } from '@openfga/sdk';

// who so ever is reading this please tell me if process.env is working beacuse the APIs dont work
// I have tried hard coding the values and it works
// process.env throws empty variable passed in client and  write/check calls

export const fgaClient = new OpenFgaClient({
  apiUrl: process.env.OPENFGA_API_URL,
  storeId: process.env.OPENFGA_STORE_ID,
  authorizationModelId: process.env.OPENFGA_MODEL_ID,
  credentials: {
    method: CredentialsMethod.ClientCredentials,
    config: {
      apiTokenIssuer: process.env.OPENFGA_API_TOKEN_ISSUER,
      apiAudience: process.env.OPENFGA_API_AUDIENCE,
      clientId: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET
    }
  }
});
