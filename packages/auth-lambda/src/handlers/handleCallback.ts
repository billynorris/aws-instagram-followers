import { APIGatewayProxyHandler } from 'aws-lambda';
import axios from 'axios';
import {
  withCommonMiddleware,
  ValidationError,
  InstagramAPIError,
  InstagramAuthResponse,
  logger,
} from '@instagram-service/common';

const callbackSchema = {
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

    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID!,
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      redirect_uri: process.env.REDIRECT_URI!,
      code,
    });

    try {
      const response = await axios.post<InstagramAuthResponse>(
        'https://api.instagram.com/oauth/access_token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      logger.info('Successfully exchanged code for token', {
        userId: response.data.user_id,
      });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(response.data),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new InstagramAPIError(
          error.response?.data?.error_message || 'Failed to exchange code for token',
          {
            status: error.response?.status,
            data: error.response?.data,
          }
        );
      }
      throw error;
    }
  } catch (error) {
    logger.error('Failed to handle callback', { error });
    throw error;
  }
};

export const handler = withCommonMiddleware(handleCallbackHandler, {
  inputSchema: callbackSchema,
});
