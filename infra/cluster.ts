import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

export function createCluster() {
  const config = new pulumi.Config("gcp");
  const project = config.require("project");
  const region = config.require("region");

  // KMS for CMEK encryption
  const keyRing = new gcp.kms.KeyRing("lifeos-keyring", {
    location: region,
  });

  const cryptoKey = new gcp.kms.CryptoKey("lifeos-etcd-key", {
    keyRing: keyRing.id,
    rotationPeriod: "7776000s", // 90 days
    purpose: "ENCRYPT_DECRYPT",
  });

  // Dev state was created before the v2 rename; keep the original logical name
  // for dev to avoid cluster replacement. Prod stays on v2.
  const clusterLogicalName = pulumi.getStack() === "prod" ? "lifeos-cluster-v2" : "lifeos-cluster";
  const cluster = new gcp.container.Cluster(clusterLogicalName, {
    location: region,
    enableAutopilot: true,
    ipAllocationPolicy: {},
    databaseEncryption: {
      state: "ENCRYPTED",
      keyName: cryptoKey.id,
    },
    workloadIdentityConfig: {
      workloadPool: pulumi.interpolate`${project}.svc.id.goog`,
    },
    releaseChannel: {
      channel: "STABLE",
    },
  });

  const kubeconfig = pulumi.all([cluster.name, cluster.endpoint, cluster.masterAuth]).apply(
    ([name, endpoint, auth]) => {
      const context = `gke_${project}_${region}_${name}`;
      return `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${auth.clusterCaCertificate}
    server: https://${endpoint}
  name: ${context}
contexts:
- context:
    cluster: ${context}
    user: ${context}
  name: ${context}
current-context: ${context}
kind: Config
users:
- name: ${context}
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: gke-gcloud-auth-plugin
      installHint: Install gke-gcloud-auth-plugin
      provideClusterInfo: true`;
    }
  );

  return { cluster, kubeconfig, cryptoKey, keyRing };
}
