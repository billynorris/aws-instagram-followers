import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { configs } from './config';
import { createApiIntegrations } from './api-gateway/integrations';
import { createApiDeployment } from './api-gateway/deployment';
import { createRoles } from './roles/lambda-roles';
import { createApiResources } from './api-gateway/resources';
import { createLambdaFunctions } from './lambda/functions';

const main = () => {
  // Create DynamoDB table
  const table = new aws.dynamodb.Table('instagram-service', {
    name: `instagram-service-${configs.environment}`,
    attributes: [{ name: 'username', type: 'S' }],
    hashKey: 'username',
    billingMode: 'PAY_PER_REQUEST',
    tags: configs.tags,
    ttl: {
      attributeName: 'ttl',
      enabled: true,
    },
  });

  // Create IAM roles
  const roles = createRoles(table);

  // Create API Gateway
  const api = new aws.apigateway.RestApi('instagram-api', {
    name: `instagram-service-${configs.environment}`,
    description: 'Instagram Service API',
    tags: configs.tags,
  });

  // Create API resources
  const resources = createApiResources(api);

  // Create Lambda functions
  const functions = createLambdaFunctions(table, roles);

  // Create API integrations
  const integrations = createApiIntegrations(api, resources, functions);

  // Create API deployment and stage
  const apiDeployment = createApiDeployment(api, integrations, {
    enableCloudWatch: true,
    enableXray: false,
  });

  // Export values
  return {
    apiUrl: pulumi.interpolate`https://${api.id}.execute-api.${configs.region}.amazonaws.com/${configs.environment}`,
  };
};

export const outputs = main();