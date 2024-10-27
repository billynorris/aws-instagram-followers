import middy from '@middy/core';
import jsonBodyParser from '@middy/http-json-body-parser';
import validator from '@middy/validator';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { logger } from '../utils/logger.js';
import { ApplicationError } from '../types/errors.js';

export interface MiddlewareOptions {
  inputSchema?: object;
  enableMetrics?: boolean;
}

export const withCommonMiddleware = (
  handler: APIGatewayProxyHandler,
  options: MiddlewareOptions = {}
) => {
  const middleware = middy(handler)
    .use(jsonBodyParser())
    .use({
      before: async (request) => {
        logger.addContext({
          requestId: request.context.awsRequestId,
          path: request.event.path,
          method: request.event.httpMethod,
        });
      },
      onError: async (request) => {
        const error = request.error;
        if (error instanceof ApplicationError) {
          const err = error as ApplicationError;
          return {
            statusCode: err.statusCode,
            body: JSON.stringify({
              error: err.message,
              code: err.code,
              details: err.details,
            }),
          };
        }

        logger.error('Unhandled error:', { error });
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: 'Internal Server Error',
            code: 'INTERNAL_ERROR',
          }),
        };
      },
    });

  if (options.inputSchema) {
    middleware.use(validator({ eventSchema: options.inputSchema }));
  }

  return middleware;
};
