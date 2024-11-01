import * as aws from '@pulumi/aws';
import { configs } from '../config';

export const createApiDeployment = (
  api: aws.apigateway.RestApi,
  integrations: any,
  options: {
    enableCloudWatch?: boolean;
    enableXray?: boolean;
  } = {}
) => {
  // Create deployment
  const deployment = new aws.apigateway.Deployment(
    'deployment',
    {
      restApi: api.id,
      triggers: {
        redeployment: new Date().toISOString(),
      },
    },
    {
      dependsOn: [
        integrations.frontendRootMethod,
        integrations.frontendRootIntegration,
        integrations.frontendProxyMethod,
        integrations.frontendProxyIntegration,
        integrations.frontendRootPermission,
        integrations.frontendProxyPermission,
        integrations.initiateAuthIntegration.integration,
        integrations.handleCallbackIntegration.integration,
        integrations.getFollowerCountIntegration.integration,
      ],
    }
  );
  // Create stage
  const stage = new aws.apigateway.Stage('stage', {
    deployment: deployment,
    restApi: api.id,
    stageName: configs.environment,
    xrayTracingEnabled: options.enableXray ?? false,
    tags: configs.tags,
  });

  // Configure stage settings
  const methodSettings = new aws.apigateway.MethodSettings('all-methods', {
    restApi: api.id,
    stageName: stage.stageName,
    methodPath: '*/*',
    settings: {
      metricsEnabled: true,
      loggingLevel: 'INFO',
      dataTraceEnabled: true,
      throttlingBurstLimit: 5000,
      throttlingRateLimit: 10000,
    },
  });

  if (options.enableCloudWatch) {
    // Create CloudWatch role for API Gateway
    const cloudWatchRole = new aws.iam.Role('api-cloudwatch-role', {
      name: `api-cloudwatch-${configs.environment}`,
      assumeRolePolicy: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'apigateway.amazonaws.com',
            },
          },
        ],
      },
    });

    // Attach CloudWatch policy
    new aws.iam.RolePolicy('api-cloudwatch-policy', {
      role: cloudWatchRole.id,
      policy: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              'logs:CreateLogGroup',
              'logs:CreateLogStream',
              'logs:DescribeLogGroups',
              'logs:DescribeLogStreams',
              'logs:PutLogEvents',
              'logs:GetLogEvents',
              'logs:FilterLogEvents',
            ],
            Resource: '*',
          },
        ],
      },
    });

    // Configure API Gateway account settings
    new aws.apigateway.Account('api-gateway-account', {
      cloudwatchRoleArn: cloudWatchRole.arn,
    });
  }

  return {
    deployment,
    stage,
    methodSettings,
  };
};
