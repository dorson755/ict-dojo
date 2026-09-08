import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';

// Configuration for Cognito User Pool
const COGNITO_REGION = process.env.AWS_REGION || 'us-east-1';
const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;

// Public paths that do not require authentication
const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback', '/'];

// Create JWKS store outside of middleware function so it's cached across requests
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for public paths and static files
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('accessToken')?.value;

  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Verify the JWT token
  try {
    if (!COGNITO_USER_POOL_ID) {
      throw new Error('NEXT_PUBLIC_COGNITO_USER_POOL_ID is not set');
    }

    if (!jwks) {
      const jwksUrl = new URL(`https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`);
      jwks = createRemoteJWKSet(jwksUrl);
    }

    // Verify token using JWKS
    await jwtVerify(accessToken, jwks, {
      issuer: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`,
      // Optionally verify client_id claim matches COGNITO_CLIENT_ID
    });

    return NextResponse.next();
  } catch (error) {
    console.error('JWT Verification failed:', error);
    const loginUrl = new URL('/login', request.url);
    // Clear invalid cookies
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('accessToken');
    response.cookies.delete('idToken');
    response.cookies.delete('refreshToken');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
