import * as pulumi from "@pulumi/pulumi";

export interface BackendConfig {
  id: string;
  convexSiteUrl: string;
}

export function loadBackends(): BackendConfig[] {
  const config = new pulumi.Config("lifeos");
  const backends = config.getObject<BackendConfig[]>("backends");

  if (backends && backends.length > 0) {
    const ids = backends.map((b) => b.id);
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      throw new Error(`Duplicate backend IDs found: ${ids.join(", ")}`);
    }
    return backends;
  }

  // Fallback: single backend from legacy key
  return [{ id: "default", convexSiteUrl: config.require("convexSiteUrl") }];
}
