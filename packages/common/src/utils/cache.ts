import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from './logger';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.CACHE_TABLE_NAME || '';

export class Cache {
  static async get<T>(userId: string): Promise<T | null> {
    try {
      const command = new GetCommand({
        TableName: TABLE_NAME,
        Key: { userId },
      });

      const response = await docClient.send(command);
      const item = response.Item;

      if (!item || item.ttl < Math.floor(Date.now() / 1000)) {
        logger.debug('Cache miss or expired', { userId });
        return null;
      }

      logger.debug('Cache hit', { userId });
      return item.data as T;
    } catch (error) {
      logger.error('Cache get error:', { error, userId });
      return null;
    }
  }

  static async set<T>(userId: string, data: T, ttlSeconds = 60): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          userId,
          data,
          ttl: Math.floor(Date.now() / 1000) + ttlSeconds,
        },
      });

      await docClient.send(command);
      logger.debug('Cache set successful', { userId });
    } catch (error) {
      logger.error('Cache set error:', { error, userId });
    }
  }
}
