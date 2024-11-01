import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from './logger';
import { InstagramUser } from '../types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME!;

export const getUser = async (username: string): Promise<InstagramUser | null> => {
  try {
    const response = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { username },
      })
    );

    return (response.Item as InstagramUser) || null;
  } catch (error) {
    logger.error('Failed to get user from DB', error);
    throw error;
  }
};

export const updateUser = async (user: InstagramUser): Promise<void> => {
  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: user,
      })
    );
  } catch (error) {
    logger.error('Failed to update user in DB', error);
    throw error;
  }
};
