import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Amplify blocks env vars prefixed with AWS_, so we use APP_REGION / RUNTIME_AWS_* there.
// For local dev, the default credential chain (shared credentials file) is the fallback.
const region = process.env.APP_REGION || process.env.AWS_REGION || 'us-east-2';

// If explicit runtime credentials are injected (Amplify hosting), use them.
// Otherwise fall back to the default SDK credential chain (local dev / EC2 / Lambda roles).
const credentials =
  process.env.RUNTIME_AWS_ACCESS_KEY_ID && process.env.RUNTIME_AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.RUNTIME_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.RUNTIME_AWS_SECRET_ACCESS_KEY,
      }
    : undefined;

// Create a raw DynamoDB client
const client = new DynamoDBClient({
  region,
  ...(credentials ? { credentials } : {}),
});

const marshallOptions = {
  // Whether to automatically convert empty strings, blobs, and sets to `null`.
  convertEmptyValues: false, // false, by default.
  // Whether to remove undefined values while marshalling.
  removeUndefinedValues: true, // false, by default.
  // Whether to convert typeof object to map attribute.
  convertClassInstanceToMap: false, // false, by default.
};

const unmarshallOptions = {
  // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
  wrapNumbers: false, // false, by default.
};

const translateConfig = { marshallOptions, unmarshallOptions };

// Create the DynamoDB Document client
export const dynamoClient = DynamoDBDocumentClient.from(client, translateConfig);

export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'ict-dojo-main';
