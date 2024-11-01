import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { configs } from '../config';

interface LambdaRoles {
  frontendRole: aws.iam.Role;
  initiateAuthRole: aws.iam.Role;
  handleCallbackRole: aws.iam.Role;
  followerCountRole: aws.iam.Role;
}

export const createLambdaFunctions = (table: aws.dynamodb.Table, roles: LambdaRoles) => {
  const commonConfig = {
    runtime: 'nodejs18.x',
    memorySize: configs.lambda.memory,
    timeout: configs.lambda.timeout,
    tags: configs.tags,
    environment: {
      variables: {
        NODE_OPTIONS: '--enable-source-maps',
        LOG_LEVEL: 'info',
      },
    },
  };

  const frontendFunction = new aws.lambda.Function('frontend', {
    ...commonConfig,
    name: `frontend-${configs.environment}`,
    handler: 'index.handler',
    role: roles.frontendRole.arn,
    code: new pulumi.asset.AssetArchive({
      '.': new pulumi.asset.FileArchive('../../packages/frontend/dist'),
    }),
    environment: {
      variables: {
        ...commonConfig.environment.variables,
        AUTH_PATH: '/auth',
        API_BASE_PATH: '/api/v1',
        NODE_ENV: 'production',
      },
    },
  });

  const initiateAuthFunction = new aws.lambda.Function('initiate-auth', {
    ...commonConfig,
    name: `initiate-auth-${configs.environment}`,
    handler: 'bundle.initiateAuth.handler',
    role: roles.initiateAuthRole.arn,
    code: new pulumi.asset.AssetArchive({
      'bundle.js': new pulumi.asset.FileAsset('../../packages/auth-lambda/dist/bundle.js'),
    }),
    environment: {
      variables: {
        ...commonConfig.environment.variables,
        INSTAGRAM_CLIENT_ID: configs.instagramClientId,
        REDIRECT_URI: configs.redirectUri,
      },
    },
  });

  const handleCallbackFunction = new aws.lambda.Function('handle-callback', {
    ...commonConfig,
    name: `handle-callback-${configs.environment}`,
    handler: 'bundle.handleCallback.handler',
    role: roles.handleCallbackRole.arn,
    code: new pulumi.asset.AssetArchive({
      'bundle.js': new pulumi.asset.FileAsset('../../packages/auth-lambda/dist/bundle.js'),
    }),
    environment: {
      variables: {
        ...commonConfig.environment.variables,
        TABLE_NAME: table.name,
        INSTAGRAM_CLIENT_ID: configs.instagramClientId,
        INSTAGRAM_CLIENT_SECRET: configs.instagramClientSecret,
        REDIRECT_URI: configs.redirectUri,
        FRONTEND_URL: configs.frontendUrl,
      },
    },
  });

  const getFollowerCountFunction = new aws.lambda.Function('get-follower-count', {
    ...commonConfig,
    name: `get-follower-count-${configs.environment}`,
    handler: 'bundle.handler',
    role: roles.followerCountRole.arn,
    code: new pulumi.asset.AssetArchive({
      'bundle.js': new pulumi.asset.FileAsset(
        '../../packages/follower-count-lambda/dist/bundle.js'
      ),
    }),
    environment: {
      variables: {
        ...commonConfig.environment.variables,
        TABLE_NAME: table.name,
      },
    },
  });

  return {
    frontendFunction,
    initiateAuthFunction,
    handleCallbackFunction,
    getFollowerCountFunction,
  };
};
