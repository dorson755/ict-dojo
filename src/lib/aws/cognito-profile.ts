import 'server-only';

import {
  AdminGetUserCommand,
  GetUserCommand,
  UpdateUserAttributesCommand,
  VerifyUserAttributeCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { COGNITO_USER_POOL_ID, cognitoClient } from './cognito';

export interface CognitoProfile {
  email?: string;
  name?: string;
  enabled?: boolean;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

function attributesToRecord(
  attributes: Array<{ Name?: string; Value?: string }> | undefined,
): Record<string, string> {
  return Object.fromEntries(
    (attributes ?? [])
      .filter((attribute) => attribute.Name && attribute.Value)
      .map((attribute) => [attribute.Name as string, attribute.Value as string]),
  );
}

export async function getCognitoProfileForTeacher(userId: string): Promise<CognitoProfile | null> {
  if (!COGNITO_USER_POOL_ID) return null;

  const response = await cognitoClient.send(new AdminGetUserCommand({
    UserPoolId: COGNITO_USER_POOL_ID,
    Username: userId,
  }));
  const attributes = attributesToRecord(response.UserAttributes);

  return {
    email: attributes.email,
    name: attributes.name,
    enabled: response.Enabled,
    status: response.UserStatus,
    createdAt: response.UserCreateDate,
    updatedAt: response.UserLastModifiedDate,
  };
}

export async function updateCurrentCognitoProfile(
  accessToken: string,
  input: { name: string; email?: string },
): Promise<{ needsEmailVerification: boolean }> {
  const attributes = [{ Name: 'name', Value: input.name }];
  if (input.email) attributes.push({ Name: 'email', Value: input.email });

  const response = await cognitoClient.send(new UpdateUserAttributesCommand({
    AccessToken: accessToken,
    UserAttributes: attributes,
  }));

  return {
    needsEmailVerification: Boolean(
      response.CodeDeliveryDetailsList?.some((delivery) => delivery.AttributeName === 'email'),
    ),
  };
}

export async function verifyCurrentUserEmail(accessToken: string, code: string): Promise<string | null> {
  await cognitoClient.send(new VerifyUserAttributeCommand({
    AccessToken: accessToken,
    AttributeName: 'email',
    Code: code,
  }));

  const response = await cognitoClient.send(new GetUserCommand({ AccessToken: accessToken }));
  return attributesToRecord(response.UserAttributes).email ?? null;
}
