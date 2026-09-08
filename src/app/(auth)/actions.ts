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
      const { AccessToken, IdToken, RefreshToken } = response.AuthenticationResult;
      
      const cookieStore = await cookies();
      
      if (AccessToken) {
        cookieStore.set('accessToken', AccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 3600, // 1 hour
        });
      }
      
      if (IdToken) {
        cookieStore.set('idToken', IdToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 3600, // 1 hour
        });
      }
      
      if (RefreshToken) {
        cookieStore.set('refreshToken', RefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 3600, // 30 days
        });
      }

      revalidatePath('/', 'layout');
      redirect('/dashboard');
    }
  } catch (error: any) {
    console.error('Login error:', error);
    return { error: error.message || 'Failed to login' };
  }
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
        { Name: 'custom:role', Value: 'student' } // Assuming custom attribute 'custom:role'
      ],
    });

    await cognitoClient.send(command);

    // Cognito usually requires email confirmation.
    // For this prototype, we'll auto-confirm or assume they can log in immediately 
    // if the User Pool is configured to not require confirmation.
    // Let's attempt to log them in directly.
    return await login(formData);
    
  } catch (error: any) {
    console.error('Signup error:', error);
    return { error: error.message || 'Failed to sign up' };
  }
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
