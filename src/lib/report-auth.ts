import { timingSafeEqual } from 'node:crypto';

const MIN_SECRET_LENGTH = 24;

export type ReportAuthResult = 'ok' | 'not_configured' | 'unauthorized';

/**
 * Authenticates the scheduler. A missing or short secret disables the route
 * entirely, so a forgotten environment variable can never leave it open.
 */
export function checkReportSecret(configured: string | undefined, authorization: string | null): ReportAuthResult {
  if (!configured || configured.length < MIN_SECRET_LENGTH) return 'not_configured';
  const match = /^Bearer (.+)$/.exec(authorization ?? '');
  if (!match) return 'unauthorized';

  const expected = Buffer.from(configured);
  const provided = Buffer.from(match[1]);
  // timingSafeEqual throws on unequal lengths, and a length mismatch is already a rejection.
  if (expected.length !== provided.length) return 'unauthorized';
  return timingSafeEqual(expected, provided) ? 'ok' : 'unauthorized';
}
