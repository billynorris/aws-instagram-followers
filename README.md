# aws-instagram-followers
This repository is specifically for infrastructure related to building a digital display that shows a users instagram follower count.

// packages/follower-count-lambda/package.json
{
  "name": "@instagram-service/follower-count-lambda",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "tsc && npm run bundle",
    "bundle": "esbuild src/index.ts --bundle --platform=node --target=node18 --outfile=dist/bundle.js --external:@aws-sdk/*",
    "test": "jest",
    "clean": "rm -rf dist coverage"
  },
  "dependencies": {
    "@instagram-service/common": "1.0.0",
    "axios": "^1.5.0"
  },
  "devDependencies": {
    "esbuild": "^0.19.4"
  }
}

// packages/follower-count-lambda/src/index.ts
export * from './handlers/getFollowerCount';

// packages/follower-count-lambda/src/handlers/getFollowerCount.ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import axios from 'axios';
import { 
  withCommonMiddleware,
  Cache,
  Metrics,
  ValidationError,
  AuthenticationError,
  InstagramAPIError,
  logger
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
        userId: { type: 'string', pattern: '^\\d+$' }
      }
    }
  }
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
        age: Date.now() - new Date(cachedData.timestamp).getTime()
      });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...cachedData,
          cached: true
        })
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
        timestamp: new Date().toISOString()
      };

      // Store in cache
      await Cache.set(userId, responseData);

      // Record API latency
      const latency = Date.now() - startTime;
      await Metrics.recordMetric('APILatency', latency, 'Milliseconds');

      logger.info('Successfully fetched follower count', {
        username: responseData.username,
        latency
      });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...responseData,
          cached: false
        })
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new InstagramAPIError('Rate limit exceeded', {
            retryAfter: error.response.headers['retry-after']
          });
        }

        throw new InstagramAPIError(
          error.response?.data?.error?.message || 'Failed to fetch follower count',
          {
            status: error.response?.status,
            data: error.response?.data
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
  inputSchema
});

// packages/follower-count-lambda/src/__tests__/getFollowerCount.test.ts
import { handler } from '../handlers/getFollowerCount';
import { createAPIGatewayEvent } from '@instagram-service/common/testing';
import { Cache, Metrics } from '@instagram-service/common';
import axios from 'axios';

jest.mock('@instagram-service/common', () => ({
  ...jest.requireActual('@instagram-service/common'),
  Cache: {
    get: jest.fn(),
    set: jest.fn(),
  },
  Metrics: {
    recordMetric: jest.fn(),
  },
}));

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('getFollowerCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return cached data when available', async () => {
    const cachedData = {
      username: 'testuser',
      follower_count: 1000,
      timestamp: new Date().toISOString()
    };

    (Cache.get as jest.Mock).mockResolvedValueOnce(cachedData);

    const event = createAPIGatewayEvent({
      pathParameters: { userId: '123456' },
      headers: { authorization: 'Bearer test-token' }
    });

    const response = await handler(event, {} as any, () => {});
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.cached).toBe(true);
    expect(body.follower_count).toBe(1000);