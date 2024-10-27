import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { configs } from './config';

// Create API Gateway
const api = new aws.apigateway.RestApi('instagram-follower-api', {
  name: `instagram-follower-api-${configs.environment}`,
  description: 'Instagram Follower Service API',
  tags: configs.tags,
});

// Create DynamoDB table for caching
const cacheTable = new aws.dynamodb.Table('follower-count-cache', {
  name: `follower-count-cache-${configs.environment}`,
  attributes: [{ name: 'userId', type: 'S' }],
  hashKey: 'userId',
  billingMode: 'PAY_PER_REQUEST',
  ttl: {
    attributeName: 'ttl',
    enabled: true,
  },
  tags: configs.tags,
});

// Create Lambda role with necessary permissions
const lambdaRole = new aws.iam.Role('lambda-role', {
  name: `instagram-follower-lambda-role-${configs.environment}`,
  assumeRolePolicy: {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'sts:AssumeRole',
        Effect: 'Allow',
        Principal: {
          Service: 'lambda.amazonaws.com',
        },
      },
    ],
  },
  tags: configs.tags,
});

// Attach basic Lambda execution policy
new aws.iam.RolePolicyAttachment('lambda-execution-policy', {
  role: lambdaRole.name,
  policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
});

// Create custom policy for DynamoDB access
const _dynamoPolicy = new aws.iam.RolePolicy('dynamo-policy', {
  role: lambdaRole.id,
  policy: {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['dynamodb:GetItem', 'dynamodb:PutItem'],
        Resource: cacheTable.arn,
      },
    ],
  },
});

// Create custom policy for CloudWatch Metrics
const _metricsPolicy = new aws.iam.RolePolicy('metrics-policy', {
  role: lambdaRole.id,
  policy: {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['cloudwatch:PutMetricData'],
        Resource: '*',
      },
    ],
  },
});

// Create Lambda functions
const initiateAuthFunction = new aws.lambda.Function('initiate-auth', {
  name: `initiate-auth-${configs.environment}`,
  runtime: 'nodejs18.x',
  handler: 'bundle.handler',
  role: lambdaRole.arn,
  code: new pulumi.asset.AssetArchive({
    'bundle.js': new pulumi.asset.FileAsset('../packages/auth-lambda/dist/bundle.js'),
  }),
  memorySize: configs.lambda.memory,
  timeout: configs.lambda.timeout,
  environment: {
    variables: {
      INSTAGRAM_CLIENT_ID: configs.instagramClientId,
      REDIRECT_URI: configs.redirectUri,
      LOG_LEVEL: 'info',
    },
  },
  tags: configs.tags,
});

const handleCallbackFunction = new aws.lambda.Function('handle-callback', {
  name: `handle-callback-${configs.environment}`,
  runtime: 'nodejs18.x',
  handler: 'bundle.handler',
  role: lambdaRole.arn,
  code: new pulumi.asset.AssetArchive({
    'bundle.js': new pulumi.asset.FileAsset('../packages/auth-lambda/dist/bundle.js'),
  }),
  memorySize: configs.lambda.memory,
  timeout: configs.lambda.timeout,
  environment: {
    variables: {
      INSTAGRAM_CLIENT_ID: configs.instagramClientId,
      INSTAGRAM_CLIENT_SECRET: configs.instagramClientSecret,
      REDIRECT_URI: configs.redirectUri,
      LOG_LEVEL: 'info',
    },
  },
  tags: configs.tags,
});

const getFollowerCountFunction = new aws.lambda.Function('get-follower-count', {
  name: `get-follower-count-${configs.environment}`,
  runtime: 'nodejs18.x',
  handler: 'bundle.handler',
  role: lambdaRole.arn,
  code: new pulumi.asset.AssetArchive({
    'bundle.js': new pulumi.asset.FileAsset('../packages/follower-count-lambda/dist/bundle.js'),
  }),
  memorySize: configs.lambda.memory,
  timeout: configs.lambda.timeout,
  environment: {
    variables: {
      CACHE_TABLE_NAME: cacheTable.name,
      ENABLE_METRICS: 'true',
      METRICS_FLUSH_INTERVAL: '60000',
      LOG_LEVEL: 'info',
    },
  },
  tags: configs.tags,
});

// Set up API Gateway resources and methods
const authResource = new aws.apigateway.Resource('auth', {
  restApi: api.id,
  parentId: api.rootResourceId,
  pathPart: 'auth',
});

const initiateResource = new aws.apigateway.Resource('initiate', {
  restApi: api.id,
  parentId: authResource.id,
  pathPart: 'initiate',
});

const callbackResource = new aws.apigateway.Resource('callback', {
  restApi: api.id,
  parentId: authResource.id,
  pathPart: 'callback',
});

const usersResource = new aws.apigateway.Resource('users', {
  restApi: api.id,
  parentId: api.rootResourceId,
  pathPart: 'users',
});

const userIdResource = new aws.apigateway.Resource('user-id', {
  restApi: api.id,
  parentId: usersResource.id,
  pathPart: '{userId}',
});

const followerCountResource = new aws.apigateway.Resource('followers', {
  restApi: api.id,
  parentId: userIdResource.id,
  pathPart: 'count',
});

// Set up API Gateway methods and integrations
const setupMethod = (
  name: string,
  resource: aws.apigateway.Resource,
  lambda: aws.lambda.Function,
  httpMethod: string = 'GET'
) => {
  const method = new aws.apigateway.Method(`${name}-method`, {
    restApi: api.id,
    resourceId: resource.id,
    httpMethod: httpMethod,
    authorization: 'NONE',
    requestParameters: {
      'method.request.path.userId': resource.pathPart.get() === '{userId}',
    },
  });

  new aws.apigateway.Integration(`${name}-integration`, {
    restApi: api.id,
    resourceId: resource.id,
    httpMethod: method.httpMethod,
    integrationHttpMethod: 'POST',
    type: 'AWS_PROXY',
    uri: lambda.invokeArn,
  });

  new aws.lambda.Permission(`${name}-permission`, {
    action: 'lambda:InvokeFunction',
    function: lambda.name,
    principal: 'apigateway.amazonaws.com',
    sourceArn: pulumi.interpolate`${api.executionArn}/*/*`,
  });
};

setupMethod('initiate-auth', initiateResource, initiateAuthFunction);
setupMethod('handle-callback', callbackResource, handleCallbackFunction);
setupMethod('get-follower-count', followerCountResource, getFollowerCountFunction);

// Create deployment and stage
const deployment = new aws.apigateway.Deployment(
  'deployment',
  {
    restApi: api.id,
    triggers: {
      redeployment: new Date().toISOString(),
    },
  },
  {
    dependsOn: [initiateResource, callbackResource, followerCountResource],
  }
);

const stage = new aws.apigateway.Stage('stage', {
  deployment: deployment.id,
  restApi: api.id,
  stageName: configs.environment,
  tags: configs.tags,
});

// CloudWatch alarms
const _apiErrorAlarm = new aws.cloudwatch.MetricAlarm('api-errors', {
  alarmDescription: 'Alert on API errors',
  comparisonOperator: 'GreaterThanThreshold',
  evaluationPeriods: 1,
  metricName: '5XXError',
  namespace: 'AWS/ApiGateway',
  period: 300,
  statistic: 'Sum',
  threshold: 5,
  dimensions: {
    ApiName: api.name,
    Stage: stage.stageName,
  },
  tags: configs.tags,
});

// Export values
export const apiUrl = pulumi.interpolate`${api.executionArn}/${stage.stageName}`;
export const cacheTableName = cacheTable.name;
