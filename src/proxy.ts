import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public paths that do not require authentication
const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback', '/onboarding', '/'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for public paths, API routes, and static files
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Firebase session cookie
  const sessionCookie = request.cookies.get('session')?.value;

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Note: Full verification of the Firebase session cookie requires the Firebase Admin SDK,
  // which uses Node.js APIs not available in the Edge Runtime. 
  // We perform a light check here, and full verification occurs in Server Components via getUserSession().
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
