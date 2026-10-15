import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { randomBytes } from 'node:crypto';
import { buildRawEmail, type MimeMessage } from './mime';

// Amplify blocks env vars prefixed with AWS_, so the runtime keys use a different prefix there.
const region = process.env.APP_REGION || process.env.AWS_REGION || 'us-east-2';
const credentials =
  process.env.RUNTIME_AWS_ACCESS_KEY_ID && process.env.RUNTIME_AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.RUNTIME_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.RUNTIME_AWS_SECRET_ACCESS_KEY,
      }
    : undefined;

const client = new SESv2Client({ region, ...(credentials ? { credentials } : {}) });

export async function sendRawEmail(message: MimeMessage): Promise<string | undefined> {
  const raw = buildRawEmail(message, randomBytes(12).toString('hex'));
  const response = await client.send(new SendEmailCommand({
    FromEmailAddress: message.from,
    Destination: { ToAddresses: message.to },
    Content: { Raw: { Data: Buffer.from(raw, 'utf8') } },
  }));
  return response.MessageId;
}
