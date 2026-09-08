import { cookies } from 'next/headers';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const COGNITO_REGION = process.env.APP_REGION || process.env.AWS_REGION || 'us-east-2';
const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export async function getUserSession() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const idToken = cookieStore.get('idToken')?.value;

  if (!accessToken || !COGNITO_USER_POOL_ID) {
    return null;
  }

  try {
    if (!jwks) {
      const jwksUrl = new URL(`https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`);
      jwks = createRemoteJWKSet(jwksUrl);
    }

    // Use ID token to get user profile details, fallback to access token for ID
    const tokenToVerify = idToken || accessToken;

    const { payload } = await jwtVerify(tokenToVerify, jwks, {
      issuer: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`,
    });

    return {
      id: payload.sub as string, // sub is the unique Cognito user ID
      email: payload.email as string,
      name: payload.name as string,
      role: (payload['custom:role'] || 'student') as string,
    };
  } catch (error) {
    console.error('Failed to get user session:', error);
    return null;
  }
}
