import { APIGatewayProxyHandler } from 'aws-lambda';
import { withCommonMiddleware, ValidationError, logger } from '@instagram-service/common';
import { getFollowerCount, refreshAccessToken } from 'packages/common/src/utils/instagram';
import { getUser, updateUser } from 'packages/common/src/utils/db';

const _inputSchema = {
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
    const username = event.pathParameters?.username;
    if (!username) {
      throw new ValidationError('Username is required');
    }

    // Get user from DB
    const user = await getUser(username);
    if (!user) {
      throw new ValidationError('User not found');
    }

    const now = Math.floor(Date.now() / 1000);
    const ONE_MINUTE = 60;

    // Check if we have a recent follower count
    if (user.lastFetchedAt && user.followerCount && now - user.lastFetchedAt < ONE_MINUTE) {
      logger.info('Returning cached follower count', { username });
      return {
        statusCode: 200,
        body: JSON.stringify({
          username: user.username,
          followerCount: user.followerCount,
          lastFetchedAt: user.lastFetchedAt,
          cached: true,
        }),
      };
    }

    // Check if token needs refresh (refresh if less than 1 minute until expiry)
    let accessToken = user.accessToken;
    if (user.tokenExpiresAt - now < ONE_MINUTE) {
      logger.info('Refreshing access token', { username });
      const refreshedToken = await refreshAccessToken(accessToken);
      accessToken = refreshedToken.access_token;
      user.accessToken = accessToken;
      user.tokenExpiresAt = now + refreshedToken.expires_in;
    }

    // Fetch new follower count
    const followerCount = await getFollowerCount(accessToken);

    // Update DB
    await updateUser({
      ...user,
      followerCount,
      lastFetchedAt: now,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        username: user.username,
        followerCount,
        lastFetchedAt: now,
        cached: false,
      }),
    };
  } catch (error) {
    logger.error('Failed to get follower count', error);
    throw error;
  }
};

export const handler = withCommonMiddleware(getFollowerCountHandler);
