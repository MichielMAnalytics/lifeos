import * as k8s from "@pulumi/kubernetes";

export function createNamespaces(provider: k8s.Provider) {
  const usersNs = new k8s.core.v1.Namespace("lifeos-users", {
    metadata: { name: "lifeos-users" },
  }, { provider });

  const systemNs = new k8s.core.v1.Namespace("lifeos-system", {
    metadata: { name: "lifeos-system" },
  }, { provider });

  return { usersNs, systemNs };
}
