import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Amplify blocks env vars prefixed with AWS_, so we use APP_REGION there.
// For local dev, AWS_REGION (set by the SDK automatically) is the fallback.
const region = process.env.APP_REGION || process.env.AWS_REGION || 'us-east-2';

// Create a raw DynamoDB client
const client = new DynamoDBClient({
  region,
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
