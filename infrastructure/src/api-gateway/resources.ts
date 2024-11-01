import * as aws from '@pulumi/aws';

export const createApiResources = (api: aws.apigateway.RestApi) => {
  // API v1 resource structure
  const apiResource = new aws.apigateway.Resource('api', {
    restApi: api.id,
    parentId: api.rootResourceId,
    pathPart: 'api',
  });

  const v1Resource = new aws.apigateway.Resource('v1', {
    restApi: api.id,
    parentId: apiResource.id,
    pathPart: 'v1',
  });

  const usersResource = new aws.apigateway.Resource('users', {
    restApi: api.id,
    parentId: v1Resource.id,
    pathPart: 'users',
  });

  const userIdResource = new aws.apigateway.Resource('username', {
    restApi: api.id,
    parentId: usersResource.id,
    pathPart: '{username}',
  });

  const followerCountResource = new aws.apigateway.Resource('followers', {
    restApi: api.id,
    parentId: userIdResource.id,
    pathPart: 'followers',
  });

  // Auth endpoints
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

  // Frontend catch-all
  const frontendProxyResource = new aws.apigateway.Resource('frontend-proxy', {
    restApi: api.id,
    parentId: api.rootResourceId,
    pathPart: '{proxy+}',
  });

  return {
    apiResource,
    v1Resource,
    usersResource,
    userIdResource,
    followerCountResource,
    authResource,
    initiateResource,
    callbackResource,
    frontendProxyResource,
  };
};
