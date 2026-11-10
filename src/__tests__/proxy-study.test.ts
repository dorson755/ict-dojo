import { proxy } from '../proxy';
import type { NextRequest } from 'next/server';

jest.mock('jose', () => ({ jwtVerify: jest.fn(), createRemoteJWKSet: jest.fn() }));
jest.mock('next/server', () => ({
  NextResponse: {
    next: () => ({ status: 200 }),
    redirect: (url: URL) => ({ status: 307, url: url.toString() }),
  },
}));

function request(path: string) {
  return {
    nextUrl: { pathname: path },
    url: `https://example.com${path}`,
    cookies: { get: () => undefined },
  } as unknown as NextRequest;
}

it.each([
  '/study',
  '/study/bgcse/keyboarding',
  '/study/bgcse/keyboarding/session-1',
  '/study/bgcse/keyboarding/teacher-guide',
])('allows anonymous study reading at %s', async (path) => {
  expect((await proxy(request(path))).status).toBe(200);
});

it.each(['/study-private', '/studying', '/practice', '/api/study'])(
  'does not make unrelated routes public: %s',
  async (path) => {
    expect((await proxy(request(path))).status).toBe(307);
  },
);
