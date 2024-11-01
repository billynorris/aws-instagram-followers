import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

interface APIGatewayResources {
  apiResource: aws.apigateway.Resource;
  v1Resource: aws.apigateway.Resource;
  usersResource: aws.apigateway.Resource;
  userIdResource: aws.apigateway.Resource;
  followerCountResource: aws.apigateway.Resource;
  authResource: aws.apigateway.Resource;
  initiateResource: aws.apigateway.Resource;
  callbackResource: aws.apigateway.Resource;
  frontendProxyResource: aws.apigateway.Resource;
}

interface LambdaFunctions {
  frontendFunction: aws.lambda.Function;
  initiateAuthFunction: aws.lambda.Function;
  handleCallbackFunction: aws.lambda.Function;
  getFollowerCountFunction: aws.lambda.Function;
}

export const createMethodAndIntegration = (
  name: string,
  api: aws.apigateway.RestApi,
  resource: aws.apigateway.Resource,
  lambda: aws.lambda.Function,
  httpMethod: string = 'GET',
  options: {
    requestParameters?: { [key: string]: boolean };
  } = {}
) => {
  const method = new aws.apigateway.Method(`${name}-method`, {
    restApi: api.id,
    resourceId: resource.id,
    httpMethod,
    authorization: 'NONE',
    requestParameters: options.requestParameters,
  });

  const integration = new aws.apigateway.Integration(`${name}-integration`, {
    restApi: api.id,
    resourceId: resource.id,
    httpMethod,
    integrationHttpMethod: 'POST',
    type: 'AWS_PROXY',
    uri: lambda.invokeArn,

    // requestParameters: options.requestParameters,
  });

  const permission = new aws.lambda.Permission(`${name}-permission`, {
    action: 'lambda:InvokeFunction',
    function: lambda.name,
    principal: 'apigateway.amazonaws.com',
    sourceArn: pulumi.interpolate`${api.executionArn}/*/${httpMethod}${resource.path}`,
  });

  return { method, integration, permission };
};

export const createApiIntegrations = (
  api: aws.apigateway.RestApi,
  resources: APIGatewayResources,
  functions: LambdaFunctions
) => {
  // Frontend root permissions
  const frontendRootPermission = new aws.lambda.Permission('frontend-root-permission', {
    action: 'lambda:InvokeFunction',
    function: functions.frontendFunction.name,
    principal: 'apigateway.amazonaws.com',
    sourceArn: pulumi.interpolate`${api.executionArn}/*/*`, // This allows all methods on all paths
  });

  // Frontend proxy permissions
  const frontendProxyPermission = new aws.lambda.Permission('frontend-proxy-permission', {
    action: 'lambda:InvokeFunction',
    function: functions.frontendFunction.name,
    principal: 'apigateway.amazonaws.com',
    sourceArn: pulumi.interpolate`${api.executionArn}/*/*`,
  });

  // Frontend root method and integration
  const frontendRootMethod = new aws.apigateway.Method('frontend-root', {
    restApi: api.id,
    resourceId: api.rootResourceId,
    httpMethod: 'ANY',
    authorization: 'NONE',
  });

  const frontendRootIntegration = new aws.apigateway.Integration('frontend-root', {
    restApi: api.id,
    resourceId: api.rootResourceId,
    httpMethod: 'ANY',
    integrationHttpMethod: 'POST',
    type: 'AWS_PROXY',
    uri: functions.frontendFunction.invokeArn,
  });

  // Frontend proxy method and integration
  const frontendProxyMethod = new aws.apigateway.Method('frontend-proxy', {
    restApi: api.id,
    resourceId: resources.frontendProxyResource.id,
    httpMethod: 'ANY',
    authorization: 'NONE',
    requestParameters: {
      'method.request.path.proxy': true,
    },
  });

  const frontendProxyIntegration = new aws.apigateway.Integration('frontend-proxy', {
    restApi: api.id,
    resourceId: resources.frontendProxyResource.id,
    httpMethod: 'ANY',
    integrationHttpMethod: 'POST',
    type: 'AWS_PROXY',
    uri: functions.frontendFunction.invokeArn,
  });

  // Backend API integrations
  const initiateAuthIntegration = createMethodAndIntegration(
    'initiate-auth',
    api,
    resources.initiateResource,
    functions.initiateAuthFunction
  );

  const handleCallbackIntegration = createMethodAndIntegration(
    'handle-callback',
    api,
    resources.callbackResource,
    functions.handleCallbackFunction
  );

  const getFollowerCountIntegration = createMethodAndIntegration(
    'get-follower-count',
    api,
    resources.followerCountResource,
    functions.getFollowerCountFunction,
    'GET',
    {
      requestParameters: {
        'method.request.path.username': true,
      },
    }
  );

  return {
    frontendRootPermission,
    frontendProxyPermission,
    frontendRootMethod,
    frontendRootIntegration,
    frontendProxyMethod,
    frontendProxyIntegration,
    initiateAuthIntegration,
    handleCallbackIntegration,
    getFollowerCountIntegration,
  };
};
