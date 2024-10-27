import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

export const configs = {
  environment: config.require("environment"),
  instagramClientId: config.require("instagramClientId"),
  instagramClientSecret: config.requireSecret("instagramClientSecret"),
  redirectUri: config.require("redirectUri"),
  region: config.get("aws:region") || "us-east-1",
  tags: {
    Environment: config.require("environment"),
    Project: "instagram-follower-service",
    ManagedBy: "pulumi"
  },
  lambda: {
    memory: parseInt(config.get("lambdaMemory") || "128"),
    timeout: parseInt(config.get("lambdaTimeout") || "10")
  }
};
