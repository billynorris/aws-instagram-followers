import { handler } from '../handlers/initiateAuth';
import { createAPIGatewayEvent } from '@instagram-service/common';
import { APIGatewayProxyResult } from 'aws-lambda';

describe('initiateAuth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      INSTAGRAM_CLIENT_ID: 'test-client-id',
      REDIRECT_URI: 'http://localhost/callback',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return a valid auth URL', async () => {
    const event = createAPIGatewayEvent();
    const response = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.authUrl).toContain('api.instagram.com/oauth/authorize');
    expect(body.authUrl).toContain('client_id=test-client-id');
    expect(body.authUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%2Fcallback');
  });

  it('should throw validation error when environment variables are missing', async () => {
    delete process.env.INSTAGRAM_CLIENT_ID;

    const event = createAPIGatewayEvent();
    const response = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });
});
