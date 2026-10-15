import { checkReportSecret } from '../report-auth';

const SECRET = 'a-long-random-secret-value-1234567890';

describe('checkReportSecret', () => {
  it('accepts the exact bearer secret', () => {
    expect(checkReportSecret(SECRET, `Bearer ${SECRET}`)).toBe('ok');
  });

  it('rejects a wrong secret of the same length', () => {
    const wrong = 'b'.repeat(SECRET.length);
    expect(checkReportSecret(SECRET, `Bearer ${wrong}`)).toBe('unauthorized');
  });

  it('rejects a wrong secret of a different length without throwing', () => {
    expect(checkReportSecret(SECRET, 'Bearer short')).toBe('unauthorized');
    expect(checkReportSecret(SECRET, `Bearer ${SECRET}extra`)).toBe('unauthorized');
  });

  it('rejects missing or malformed headers', () => {
    expect(checkReportSecret(SECRET, null)).toBe('unauthorized');
    expect(checkReportSecret(SECRET, '')).toBe('unauthorized');
    expect(checkReportSecret(SECRET, SECRET)).toBe('unauthorized');
    expect(checkReportSecret(SECRET, `Basic ${SECRET}`)).toBe('unauthorized');
    expect(checkReportSecret(SECRET, 'Bearer ')).toBe('unauthorized');
  });

  it('fails closed when no secret is configured', () => {
    expect(checkReportSecret(undefined, `Bearer ${SECRET}`)).toBe('not_configured');
    expect(checkReportSecret('', 'Bearer ')).toBe('not_configured');
  });

  it('refuses to run with a weak secret even if the caller matches it', () => {
    expect(checkReportSecret('short', 'Bearer short')).toBe('not_configured');
  });
});
