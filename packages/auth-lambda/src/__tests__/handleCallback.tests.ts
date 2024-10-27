import { handler } from '../handlers/handleCallback';
import { createAPIGatewayEvent } from '@instagram-service/common';
import { APIGatewayProxyResult } from 'aws-lambda';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('handleCallback', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      INSTAGRAM_CLIENT_ID: 'test-client-id',
      INSTAGRAM_CLIENT_SECRET: 'test-client-secret',
      REDIRECT_URI: 'http://localhost/callback',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetAllMocks();
  });

  it('should successfully exchange code for token', async () => {
    const mockResponse = {
      data: {
        access_token: 'test-token',
        user_id: '123456',
      },
    };

    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    const event = createAPIGatewayEvent({
      queryStringParameters: { code: 'test-code' },
    });

    const response = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.access_token).toBe('test-token');
    expect(body.user_id).toBe('123456');
  });

  it('should handle missing code parameter', async () => {
    const event = createAPIGatewayEvent();
    const response = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('should handle Instagram API errors', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { error_message: 'Invalid code' },
      },
    });

    const event = createAPIGatewayEvent({
      queryStringParameters: { code: 'invalid-code' },
    });

    const response = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(500);
    expect(body.code).toBe('INSTAGRAM_API_ERROR');
  });
});
