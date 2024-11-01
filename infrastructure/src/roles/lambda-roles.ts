import * as aws from '@pulumi/aws';
import { configs } from '../config';

export const createLambdaRole = (name: string, description: string) => {
  const role = new aws.iam.Role(`${name}-role`, {
    name: `${name}-role-${configs.environment}`,
    description,
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

  // Basic Lambda execution policy for CloudWatch Logs
  new aws.iam.RolePolicyAttachment(`${name}-basic-execution`, {
    role: role.name,
    policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
  });

  return role;
};

// Specific roles for each Lambda
export const createRoles = (table: aws.dynamodb.Table) => {
  const frontendRole = createLambdaRole('frontend', 'Role for frontend Lambda');

  const initiateAuthRole = createLambdaRole('initiate-auth', 'Role for Instagram OAuth initiation');

  const handleCallbackRole = createLambdaRole(
    'handle-callback',
    'Role for Instagram OAuth callback'
  );

  // Add DynamoDB permissions to callback handler
  new aws.iam.RolePolicy('callback-dynamo-policy', {
    role: handleCallbackRole.id,
    policy: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['dynamodb:PutItem'],
          Resource: table.arn,
        },
      ],
    },
  });

  const followerCountRole = createLambdaRole('follower-count', 'Role for fetching follower counts');

  // Add DynamoDB permissions to follower count handler
  new aws.iam.RolePolicy('follower-count-dynamo-policy', {
    role: followerCountRole.id,
    policy: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['dynamodb:GetItem', 'dynamodb:PutItem'],
          Resource: table.arn,
        },
      ],
    },
  });

  return {
    frontendRole,
    initiateAuthRole,
    handleCallbackRole,
    followerCountRole,
  };
};
