import { buildRawEmail, type MimeMessage } from '../mime';

const base: MimeMessage = {
  from: 'ICT Dojo <reports@aldion.life>',
  to: ['info@theheuristicacademy.com'],
  subject: 'Weekly report',
  text: 'Plain body',
  html: '<p>HTML body</p>',
  attachment: { filename: 'weekly.csv', contentType: 'text/csv; charset=utf-8', content: '"a","b"\n"1","2"' },
};

const decode = (raw: string, marker: string) => {
  const part = raw.split(marker)[1] ?? '';
  const body = part.split('\r\n\r\n')[1]?.split('\r\n--')[0] ?? '';
  return Buffer.from(body.replace(/\r\n/g, ''), 'base64').toString('utf8');
};

describe('buildRawEmail', () => {
  it('builds a multipart message with text, html and a csv attachment', () => {
    const raw = buildRawEmail(base, 'seed1');
    expect(raw).toContain('From: ICT Dojo <reports@aldion.life>');
    expect(raw).toContain('To: info@theheuristicacademy.com');
    expect(raw).toContain('Content-Type: multipart/mixed; boundary="mixed_seed1"');
    expect(raw).toContain('Content-Disposition: attachment; filename="weekly.csv"');
    expect(decode(raw, 'text/plain; charset=UTF-8')).toBe('Plain body');
    expect(decode(raw, 'text/html; charset=UTF-8')).toBe('<p>HTML body</p>');
    expect(decode(raw, 'Content-Disposition: attachment; filename="weekly.csv"')).toBe('"a","b"\n"1","2"');
  });

  it('closes every multipart boundary', () => {
    const raw = buildRawEmail(base, 'seed1');
    expect(raw).toContain('--alt_seed1--');
    expect(raw).toContain('--mixed_seed1--');
  });

  it('encodes a non-ASCII subject as an encoded word', () => {
    const raw = buildRawEmail({ ...base, subject: 'Reporte semanal: Renée' }, 's');
    const line = raw.split('\r\n').find((entry) => entry.startsWith('Subject:')) ?? '';
    expect(line).toMatch(/^Subject: =\?UTF-8\?B\?.+\?=$/);
    const encoded = /=\?UTF-8\?B\?(.+)\?=/.exec(line)?.[1] ?? '';
    expect(Buffer.from(encoded, 'base64').toString('utf8')).toBe('Reporte semanal: Renée');
  });

  it('cannot be used to inject headers through the subject or addresses', () => {
    const raw = buildRawEmail({
      ...base,
      subject: 'Hi\r\nBcc: attacker@example.com',
      to: ['info@theheuristicacademy.com\r\nBcc: attacker@example.com'],
    }, 's');
    const headers = raw.split('\r\n\r\n')[0].split('\r\n');
    expect(headers.some((line) => line.startsWith('Bcc:'))).toBe(false);
  });

  it('escapes quotes in the attachment filename', () => {
    const raw = buildRawEmail({ ...base, attachment: { ...base.attachment, filename: 'a"b.csv' } }, 's');
    expect(raw).toContain('filename="a\\"b.csv"');
  });

  it('wraps long base64 lines at 76 characters', () => {
    const raw = buildRawEmail({ ...base, text: 'x'.repeat(2000) }, 's');
    const longest = Math.max(...raw.split('\r\n').map((line) => line.length));
    expect(longest).toBeLessThanOrEqual(120);
  });
});
