import { APIGatewayProxyHandler } from 'aws-lambda';
import { withCommonMiddleware, ValidationError, logger } from '@instagram-service/common';

const initiateAuthHandler: APIGatewayProxyHandler = async (_event) => {
  try {
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const redirectUri = process.env.REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new ValidationError('Missing required configuration', {
        missingVars: {
          clientId: !clientId,
          redirectUri: !redirectUri,
        },
      });
    }

    const authUrl = new URL('https://api.instagram.com/oauth/authorize');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', 'user_profile,user_media');
    authUrl.searchParams.append('response_type', 'code');

    logger.info('Initiated Instagram OAuth flow');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authUrl: authUrl.toString(),
      }),
    };
  } catch (error) {
    logger.error('Failed to initiate auth', { error });
    throw error;
  }
};

export const handler = withCommonMiddleware(initiateAuthHandler);