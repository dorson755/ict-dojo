import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

const region = process.env.APP_REGION || process.env.AWS_REGION || 'us-east-2';

const credentials =
  process.env.RUNTIME_AWS_ACCESS_KEY_ID && process.env.RUNTIME_AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.RUNTIME_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.RUNTIME_AWS_SECRET_ACCESS_KEY,
      }
    : undefined;

export const cognitoClient = new CognitoIdentityProviderClient({
  region,
  ...(credentials ? { credentials } : {}),
});

export const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
export const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!;
