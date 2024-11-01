import { APIGatewayProxyHandler } from 'aws-lambda';
import axios from 'axios';
import { withCommonMiddleware, ValidationError, logger } from '@instagram-service/common';
import { updateUser } from 'packages/common/src/utils/db';

const _callbackSchema = {
  type: 'object',
  required: ['queryStringParameters'],
  properties: {
    queryStringParameters: {
      type: 'object',
      required: ['code'],
      properties: {
        code: { type: 'string', minLength: 1 },
      },
    },
  },
};

const handleCallbackHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const code = event.queryStringParameters?.code;

    if (!code) {
      throw new ValidationError('Authorization code is required');
    }

    logger.info('Processing OAuth callback');

    // Exchange code for token
    const tokenResponse = await axios.post(
      'https://api.instagram.com/oauth/access_token',
      new URLSearchParams({
        client_id: process.env.INSTAGRAM_CLIENT_ID!,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: process.env.REDIRECT_URI!,
        code,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    // Get user details
    const userResponse = await axios.get('https://graph.instagram.com/me', {
      params: {
        fields: 'id,username',
        access_token: tokenResponse.data.access_token,
      },
    });

    // Store in DynamoDB
    await updateUser({
      id: tokenResponse.data.id,
      username: userResponse.data.username,
      accessToken: tokenResponse.data.access_token,
      tokenExpiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
      lastFetchedAt: undefined,
      followerCount: undefined,
    });

    // Redirect to frontend with success message
    return {
      statusCode: 302,
      headers: {
        Location: `${process.env.FRONTEND_URL}/success?username=${userResponse.data.username}`,
      },
      body: '',
    };
  } catch (error) {
    logger.error('Failed to handle callback', error);
    return {
      statusCode: 302,
      headers: {
        Location: `${process.env.FRONTEND_URL}/error?message=${encodeURIComponent('Authentication failed')}`,
      },
      body: '',
    };
  }
};

export const handler = withCommonMiddleware(handleCallbackHandler);
