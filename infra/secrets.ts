import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

export function createSecrets(
  provider: k8s.Provider,
  systemNs: k8s.core.v1.Namespace,
) {
  const config = new pulumi.Config("lifeos");

  const systemSecrets = new k8s.core.v1.Secret("lifeos-system-secrets", {
    metadata: {
      name: "lifeos-system-secrets",
      namespace: systemNs.metadata.name,
    },
    type: "Opaque",
    stringData: {
      "jwt-signing-key": config.requireSecret("jwtSigningKey"),
      "gateway-system-key": config.requireSecret("gatewaySystemKey"),
      "anthropic-api-key": config.requireSecret("anthropicApiKey"),
      ...(config.getSecret("openaiApiKey") ? { "openai-api-key": config.requireSecret("openaiApiKey") } : {}),
      ...(config.getSecret("googleApiKey") ? { "google-api-key": config.requireSecret("googleApiKey") } : {}),
    },
  }, { provider, dependsOn: [systemNs] });

  return { systemSecrets };
}
