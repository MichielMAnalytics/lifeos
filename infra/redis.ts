import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

export function createRedis() {
  const gcpConfig = new pulumi.Config("gcp");
  const region = gcpConfig.require("region");

  const instance = new gcp.redis.Instance("lifeos-redis", {
    tier: "BASIC",
    memorySizeGb: 1,
    region,
    redisVersion: "REDIS_7_2",
    displayName: "LifeOS Redis",
    authEnabled: true,
  });

  const redisUrl = pulumi.interpolate`redis://:${instance.authString}@${instance.host}:${instance.port}`;

  return { instance, redisUrl };
}
