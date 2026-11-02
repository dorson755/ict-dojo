import { cookies } from 'next/headers';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ExamError } from '@/domains/exams/results';

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
export function isExamSuperadmin(userId: string): boolean {
  return (process.env.EXAM_SUPERADMIN_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(userId);
}
/** The new intake verifies the ID token's issuer, audience, and token use. */
export async function getExamUser(): Promise<{ id: string; superadmin: boolean } | null> {
  const token = (await cookies()).get('idToken')?.value;
  const pool = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const audience = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  if (!token || !pool || !audience) return null;
  const region = process.env.APP_REGION || process.env.AWS_REGION || 'us-east-2';
  const issuer = `https://cognito-idp.${region}.amazonaws.com/${pool}`;
  try {
    jwks ??= createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
    const { payload } = await jwtVerify(token, jwks, { issuer, audience, algorithms: ['RS256'] });
    if (payload.token_use !== 'id' || typeof payload.sub !== 'string' || !payload.sub) return null;
    return { id: payload.sub, superadmin: isExamSuperadmin(payload.sub) };
  } catch {
    return null;
  }
}
export async function requireExamUser(superadmin = false) {
  const user = await getExamUser();
  if (!user) throw new ExamError('Sign in before contributing papers.');
  if (superadmin && !user.superadmin)
    throw new ExamError('Only a superadmin can review papers or change coverage.');
  return user;
}
