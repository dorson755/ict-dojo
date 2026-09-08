import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

// Ensure region is set, defaulting to us-east-1
const region = process.env.AWS_REGION || 'us-east-1';

export const cognitoClient = new CognitoIdentityProviderClient({
  region,
});

export const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
export const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!;
