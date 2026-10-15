export interface MimeMessage {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  attachment: { filename: string; contentType: string; content: string };
}

/** Header values must be one line, or a value could inject extra headers. */
function headerValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

/** RFC 2047 encoded-word, so non-ASCII subjects and filenames survive. */
function encodeWord(value: string): string {
  const clean = headerValue(value);
  if (/^[\x20-\x7e]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${Buffer.from(clean, 'utf8').toString('base64')}?=`;
}

function base64Lines(content: string): string {
  return (Buffer.from(content, 'utf8').toString('base64').match(/.{1,76}/g) ?? []).join('\r\n');
}

function quoted(value: string): string {
  return headerValue(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

export function buildRawEmail(message: MimeMessage, boundarySeed: string): string {
  const mixed = `mixed_${boundarySeed}`;
  const alternative = `alt_${boundarySeed}`;
  const filename = quoted(message.attachment.filename);

  return [
    `From: ${headerValue(message.from)}`,
    `To: ${message.to.map(headerValue).join(', ')}`,
    `Subject: ${encodeWord(message.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${mixed}"`,
    '',
    `--${mixed}`,
    `Content-Type: multipart/alternative; boundary="${alternative}"`,
    '',
    `--${alternative}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Lines(message.text),
    `--${alternative}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Lines(message.html),
    `--${alternative}--`,
    `--${mixed}`,
    `Content-Type: ${headerValue(message.attachment.contentType)}; name="${filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${filename}"`,
    '',
    base64Lines(message.attachment.content),
    `--${mixed}--`,
    '',
  ].join('\r\n');
}
