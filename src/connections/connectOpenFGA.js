import { CredentialsMethod, OpenFgaClient } from '@openfga/sdk';

let connection = null;

const getFgaClient = () => {
  if (connection) {
    return connection;
  }

  const config = {
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
  };

  connection = new OpenFgaClient(config);
  return connection;
};

export const fgaClient = getFgaClient();
