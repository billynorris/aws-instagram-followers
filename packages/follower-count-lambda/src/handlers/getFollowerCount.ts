import { APIGatewayProxyHandler } from 'aws-lambda';
import axios from 'axios';
import {
  withCommonMiddleware,
  Cache,
  Metrics,
  ValidationError,
  AuthenticationError,
  InstagramAPIError,
  logger,
} from '@instagram-service/common';

interface FollowerCount {
  username: string;
  follower_count: number;
  timestamp: string;
}

const inputSchema = {
  type: 'object',
  required: ['pathParameters'],
  properties: {
    pathParameters: {
      type: 'object',
      required: ['userId'],
      properties: {
        userId: { type: 'string', pattern: '^\\d+$' },
      },
    },
  },
};

const getFollowerCountHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const accessToken = event.headers.authorization?.replace('Bearer ', '');
    const userId = event.pathParameters?.userId;

    if (!accessToken) {
      throw new AuthenticationError('Access token is required');
    }

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Add context for logging
    logger.addContext({ userId });

    // Check cache first
    const startTime = Date.now();
    const cachedData = await Cache.get<FollowerCount>(userId);

    if (cachedData) {
      await Metrics.recordMetric('CacheHit', 1);
      logger.info('Returning cached follower count', {
        username: cachedData.username,
        age: Date.now() - new Date(cachedData.timestamp).getTime(),
      });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...cachedData,
          cached: true,
        }),
      };
    }

    await Metrics.recordMetric('CacheMiss', 1);

    // Fetch from Instagram API
    try {
      const response = await axios.get(`https://graph.instagram.com/${userId}`, {
        params: {
          fields: 'username,followers_count',
          access_token: accessToken,
        },
      });

      const responseData: FollowerCount = {
        username: response.data.username,
        follower_count: response.data.followers_count,
        timestamp: new Date().toISOString(),
      };

      // Store in cache
      await Cache.set(userId, responseData);

      // Record API latency
      const latency = Date.now() - startTime;
      await Metrics.recordMetric('APILatency', latency, 'Milliseconds');

      logger.info('Successfully fetched follower count', {
        username: responseData.username,
        latency,
      });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...responseData,
          cached: false,
        }),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new InstagramAPIError('Rate limit exceeded', {
            retryAfter: error.response.headers['retry-after'],
          });
        }

        throw new InstagramAPIError(
          error.response?.data?.error?.message || 'Failed to fetch follower count',
          {
            status: error.response?.status,
            data: error.response?.data,
          }
        );
      }
      throw error;
    }
  } catch (error) {
    logger.error('Failed to get follower count', { error });
    throw error;
  }
};

export const handler = withCommonMiddleware(getFollowerCountHandler, {
  inputSchema,
});
