jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('jose', () => ({ createRemoteJWKSet: jest.fn(), jwtVerify: jest.fn() }));
import { cookies } from 'next/headers';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getExamUser, isExamSuperadmin, requireExamUser } from '../auth';

const previous = { ...process.env };
beforeEach(() => {
  jest.resetAllMocks();
  (createRemoteJWKSet as jest.Mock).mockReturnValue(jest.fn());
  process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID = 'test-pool';
  process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID = 'test-client';
  process.env.EXAM_SUPERADMIN_IDS = 'owner, another-owner';
  (cookies as jest.Mock).mockResolvedValue({ get: () => ({ value: 'test-token' }) });
  (jwtVerify as jest.Mock).mockResolvedValue({
    payload: { sub: 'student', token_use: 'id', 'custom:role': 'admin' },
  });
});
afterAll(() => {
  process.env = previous;
});
it('does not grant exam superadmin rights from teacher/admin roles', async () => {
  expect(await getExamUser()).toEqual({ id: 'student', superadmin: false });
  await expect(requireExamUser(true)).rejects.toThrow('Only a superadmin');
});
it('uses an exact server-side allowlist and fails closed when empty', () => {
  expect(isExamSuperadmin('owner')).toBe(true);
  expect(isExamSuperadmin('another-owner')).toBe(true);
  expect(isExamSuperadmin('own')).toBe(false);
  process.env.EXAM_SUPERADMIN_IDS = '';
  expect(isExamSuperadmin('owner')).toBe(false);
});
it('checks issuer, audience, algorithm, and ID token use', async () => {
  await getExamUser();
  expect(jwtVerify).toHaveBeenCalledWith(
    'test-token',
    expect.anything(),
    expect.objectContaining({
      audience: 'test-client',
      algorithms: ['RS256'],
      issuer: expect.stringContaining('test-pool'),
    }),
  );
  (jwtVerify as jest.Mock).mockResolvedValue({ payload: { sub: 'owner', token_use: 'access' } });
  expect(await getExamUser()).toBeNull();
});
it('rejects missing cookies and failed signature checks', async () => {
  (cookies as jest.Mock).mockResolvedValue({ get: () => undefined });
  expect(await getExamUser()).toBeNull();
  await expect(requireExamUser()).rejects.toThrow('Sign in');
  (cookies as jest.Mock).mockResolvedValue({ get: () => ({ value: 'bad' }) });
  (jwtVerify as jest.Mock).mockRejectedValue(new Error('Bad signature'));
  expect(await getExamUser()).toBeNull();
});
