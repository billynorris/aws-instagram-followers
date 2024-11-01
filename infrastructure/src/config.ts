import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();

export const configs = {
  environment: config.require('environment'),
  region: config.get('aws:region') || 'eu-west-2',
  instagramClientId: config.require('instagramClientId'),
  instagramClientSecret: config.requireSecret('instagramClientSecret'),
  redirectUri: config.require('redirectUri'),
  frontendUrl: config.require('frontendUrl'),
  tags: {
    Environment: config.require('environment'),
    Project: 'instagram-follower-service',
    ManagedBy: 'pulumi',
  },
  lambda: {
    memory: parseInt(config.get('lambdaMemory') || '256'),
    timeout: parseInt(config.get('lambdaTimeout') || '30'),
  },
};
