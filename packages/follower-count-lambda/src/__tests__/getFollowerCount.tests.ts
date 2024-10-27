// import { handler } from '../handlers/getFollowerCount';
// import { createAPIGatewayEvent } from '@instagram-service/common/testing';
// import { Cache, Metrics } from '@instagram-service/common';
// import axios from 'axios';

// jest.mock('@instagram-service/common', () => ({
//   ...jest.requireActual('@instagram-service/common'),
//   Cache: {
//     get: jest.fn(),
//     set: jest.fn(),
//   },
//   Metrics: {
//     recordMetric: jest.fn(),
//   },
// }));

// jest.mock('axios');
// const mockedAxios = axios as jest.Mocked<typeof axios>;

// describe('getFollowerCount', () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   it('should return cached data when available', async () => {
//     const cachedData = {
//       username: 'testuser',
//       follower_count: 1000,
//       timestamp: new Date().toISOString()
//     };

//     (Cache.get as jest.Mock).mockResolvedValueOnce(cachedData);

//     const event = createAPIGatewayEvent({
//       pathParameters: { userId: '123456' },
//       headers: { authorization: 'Bearer test-token' }
//     });

//     const response = await handler(event, {} as any, () => {});
//     const body = JSON.parse(response.body);

//     expect(response.statusCode).toBe(200);
//     expect(body.cached).toBe(true);
//     expect(body.follower_count).toBe(1000);
//   })})