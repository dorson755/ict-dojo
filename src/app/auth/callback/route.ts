import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COGNITO_CLIENT_ID } from '@/lib/aws/cognito';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // Exchange the authorization code for tokens via Cognito Token Endpoint
    const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;
    
    if (domain) {
      try {
        const tokenResponse = await fetch(`https://${domain}/oauth2/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: COGNITO_CLIENT_ID,
            code: code,
            redirect_uri: redirectUri,
          }),
        });

        if (tokenResponse.ok) {
          const tokens = await tokenResponse.json();
          
          const cookieStore = await cookies();
          
          if (tokens.access_token) {
            cookieStore.set('accessToken', tokens.access_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: tokens.expires_in || 3600,
            });
          }
          
          if (tokens.id_token) {
            cookieStore.set('idToken', tokens.id_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: tokens.expires_in || 3600,
            });
          }
          
          if (tokens.refresh_token) {
            cookieStore.set('refreshToken', tokens.refresh_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 30 * 24 * 3600,
            });
          }

          // We don't have the profile check yet because we haven't implemented DynamoDB
          // For now, redirect to onboarding or dashboard
          return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
        } else {
          console.error('Token exchange failed:', await tokenResponse.text());
        }
      } catch (err) {
        console.error('Error in token exchange:', err);
      }
    }
  }

  // URL to redirect to after sign in process completes or fails
  return NextResponse.redirect(new URL('/login?error=auth', requestUrl.origin));
}
