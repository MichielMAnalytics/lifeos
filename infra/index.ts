import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

import { createCluster } from "./cluster";
import { createNamespaces } from "./namespaces";
import { createStorageClass } from "./storage";
import { createNetworking } from "./networking";
import { createRedis } from "./redis";
import { createGateway } from "./gateway";
import { createNetworkPolicies } from "./network-policies";
import { createSecrets } from "./secrets";
import { createIAM } from "./iam";
// import { createReconciler, createReconcilerRBAC } from "./reconciler";
import { createPvcGarbageCollector } from "./pvc-gc";
import { createOAuth2Proxy } from "./oauth2-proxy";
import { loadBackends } from "./backends";

const config = new pulumi.Config("lifeos");
const openclawImageTag = config.get("openclawImageTag") ?? "latest";
const gatewayImageName = config.require("gatewayImageName");

// Load backend configurations
const backends = loadBackends();

// 1. GKE Autopilot cluster + KMS
const { cluster, kubeconfig, cryptoKey, keyRing } = createCluster();

// 2. Kubernetes provider from kubeconfig
const k8sProvider = new k8s.Provider("gke-provider", {
  kubeconfig,
});

// 3. IAM: GCP service accounts, KMS bindings, Workload Identity Federation
const { gatewayGcpSa, wifPool, wifProviders, gatewayServiceAccountEmail, certManagerServiceAccountEmail } = createIAM(
  cryptoKey.id,
  keyRing.id,
  backends,
);

// 4. Namespaces
const { usersNs, systemNs } = createNamespaces(k8sProvider);

// 5. CMEK-encrypted StorageClass
const storageClass = createStorageClass(k8sProvider, cryptoKey.id);

// 6. Secrets
const { systemSecrets } = createSecrets(k8sProvider, systemNs);

// 7. Networking: nginx-ingress, cert-manager, DNS
const networking = createNetworking(k8sProvider, systemNs, certManagerServiceAccountEmail);

// 8. Redis (Memorystore)
const redis = createRedis();

// 9. AI Gateway — one per backend
const gateways = backends.map((b) =>
  createGateway(k8sProvider, systemNs, gatewayServiceAccountEmail, openclawImageTag, gatewayImageName, b, redis.redisUrl),
);

// 10. OAuth2 Proxy — disabled (LifeOS pods are headless, no UI to protect)
// const oauth2Proxy = createOAuth2Proxy(k8sProvider, systemNs);

// 11. Network policies
const networkPolicies = createNetworkPolicies(k8sProvider, usersNs, systemNs);

// 12. Reconciler — temporarily disabled
// const reconcilerRBAC = createReconcilerRBAC(k8sProvider, systemNs);
// const reconcilers = backends.map((b) =>
//   createReconciler(k8sProvider, systemNs, b, reconcilerRBAC),
// );

// 13. PVC garbage collector
const pvcGc = createPvcGarbageCollector(k8sProvider, systemNs);

// Stack outputs
export const k8sApiUrl = cluster.endpoint;
export const gcpWorkloadIdentityProviders = Object.fromEntries(
  wifProviders.map((p) => [p.id, p.provider.name]),
);
export const gcpServiceAccountEmail = gatewayGcpSa.email;
export const clusterName = cluster.name;
export const ingressIp = networking.ingressIp;
