'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cognitoClient, COGNITO_CLIENT_ID } from '@/lib/aws/cognito';
import {
  InitiateAuthCommand,
  SignUpCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  let authResult: { AccessToken?: string; IdToken?: string; RefreshToken?: string } | null = null;

  try {
    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const response = await cognitoClient.send(command);

    if (response.AuthenticationResult) {
      authResult = response.AuthenticationResult;
    }
  } catch (error: unknown) {
    console.error('Login error:', error);
    return { error: error instanceof Error ? error.message : 'Failed to login' };
  }

  // redirect() must be called OUTSIDE the try/catch block
  if (authResult) {
    const { AccessToken, IdToken, RefreshToken } = authResult;
    const cookieStore = await cookies();

    if (AccessToken) {
      cookieStore.set('accessToken', AccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3600,
      });
    }

    if (IdToken) {
      cookieStore.set('idToken', IdToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3600,
      });
    }

    if (RefreshToken) {
      cookieStore.set('refreshToken', RefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 3600,
      });
    }

    revalidatePath('/', 'layout');
    redirect('/dashboard');
  }

  return { error: 'Authentication failed — no tokens returned' };
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const displayName = formData.get('displayName') as string;

  try {
    const command = new SignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: displayName },
        { Name: 'custom:role', Value: 'student' },
      ],
    });

    await cognitoClient.send(command);
  } catch (error: unknown) {
    console.error('Signup error:', error);
    return { error: error instanceof Error ? error.message : 'Failed to sign up' };
  }

  // Call login OUTSIDE the try/catch so redirect() works correctly
  return await login(formData);
}

export async function loginWithGoogle() {
  // Cognito Hosted UI URL for Google federation
  const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  const clientId = COGNITO_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;
  
  if (!domain) {
    return { error: 'Cognito Domain not configured' };
  }

  const url = `https://${domain}/oauth2/authorize?identity_provider=Google&response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email+openid+profile`;
  
  redirect(url);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('accessToken');
  cookieStore.delete('idToken');
  cookieStore.delete('refreshToken');
  
  redirect('/login');
}
