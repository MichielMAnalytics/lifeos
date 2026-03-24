import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { BackendConfig } from "./backends";

export function createIAM(
  kmsKeyId: pulumi.Output<string>,
  kmsKeyRingId: pulumi.Output<string>,
  backends: BackendConfig[],
) {
  const config = new pulumi.Config("lifeos");
  const gcpConfig = new pulumi.Config("gcp");
  const project = gcpConfig.require("project");
  const dnsProvider = config.get("dnsProvider") ?? "cloudDns";

  // GCP Service Account for AI Gateway
  const gatewayGcpSa = new gcp.serviceaccount.Account("ai-gateway-sa", {
    accountId: "ai-gateway",
    displayName: "AI Gateway Service Account",
    project,
  });

  // Grant Secret Manager accessor role to gateway SA
  new gcp.projects.IAMMember("gateway-secret-accessor", {
    project,
    role: "roles/secretmanager.secretAccessor",
    member: pulumi.interpolate`serviceAccount:${gatewayGcpSa.email}`,
  });

  // Grant Artifact Registry reader to gateway SA (needed for image pulls via Workload Identity)
  new gcp.projects.IAMMember("gateway-artifact-registry-reader", {
    project,
    role: "roles/artifactregistry.reader",
    member: pulumi.interpolate`serviceAccount:${gatewayGcpSa.email}`,
  });

  // Grant Vertex AI user to gateway SA (needed for Kimi K2 via Vertex AI MaaS)
  new gcp.projects.IAMMember("gateway-vertex-ai-user", {
    project,
    role: "roles/aiplatform.user",
    member: pulumi.interpolate`serviceAccount:${gatewayGcpSa.email}`,
  });

  // Workload Identity binding: allow per-backend K8s SAs to impersonate GCP SA
  new gcp.serviceaccount.IAMBinding("gateway-workload-identity", {
    serviceAccountId: gatewayGcpSa.name,
    role: "roles/iam.workloadIdentityUser",
    members: backends.map(
      (b) => pulumi.interpolate`serviceAccount:${project}.svc.id.goog[lifeos-system/ai-gateway-${b.id}]`,
    ),
  });

  // Grant Artifact Registry reader to default Compute Engine SA (for GKE image pulls)
  const computeDefaultSa = pulumi.interpolate`serviceAccount:${gcp.organizations.getProjectOutput({ projectId: project }).number}-compute@developer.gserviceaccount.com`;

  new gcp.projects.IAMMember("gke-artifact-registry-reader", {
    project,
    role: "roles/artifactregistry.reader",
    member: computeDefaultSa,
  });

  // KMS IAM: allow GKE service agent to use the CMEK key
  const gkeServiceAgent = pulumi.interpolate`service-${gcp.organizations.getProjectOutput({ projectId: project }).number}@container-engine-robot.iam.gserviceaccount.com`;

  new gcp.kms.CryptoKeyIAMMember("gke-kms-encrypt-decrypt", {
    cryptoKeyId: kmsKeyId,
    role: "roles/cloudkms.cryptoKeyEncrypterDecrypter",
    member: pulumi.interpolate`serviceAccount:${gkeServiceAgent}`,
  });

  // KMS IAM: allow Compute Engine service agent for PD encryption
  const computeServiceAgent = pulumi.interpolate`service-${gcp.organizations.getProjectOutput({ projectId: project }).number}@compute-system.iam.gserviceaccount.com`;

  new gcp.kms.CryptoKeyIAMMember("compute-kms-encrypt-decrypt", {
    cryptoKeyId: kmsKeyId,
    role: "roles/cloudkms.cryptoKeyEncrypterDecrypter",
    member: pulumi.interpolate`serviceAccount:${computeServiceAgent}`,
  });

  // GCP Service Account for Convex K8s (writes BYOK keys from Convex actions)
  const convexK8sSa = new gcp.serviceaccount.Account("convex-k8s-sa", {
    accountId: "convex-k8s",
    displayName: "Convex K8s Service Account",
    project,
  });

  // Grant Secret Manager admin to Convex K8s SA
  new gcp.projects.IAMMember("convex-k8s-secret-admin", {
    project,
    role: "roles/secretmanager.admin",
    member: pulumi.interpolate`serviceAccount:${convexK8sSa.email}`,
  });

  // Grant Kubernetes Engine Developer to Convex K8s SA
  new gcp.projects.IAMMember("convex-k8s-gke-developer", {
    project,
    role: "roles/container.developer",
    member: pulumi.interpolate`serviceAccount:${convexK8sSa.email}`,
  });

  // Workload Identity Federation for Convex — shared pool, per-backend providers
  const wifPool = new gcp.iam.WorkloadIdentityPool("convex-wif-pool", {
    workloadIdentityPoolId: "convex-pool",
    displayName: "Convex Workload Identity Pool",
    description: "WIF pool for Convex backend to access GCP resources",
    project,
  });

  const wifProviders = backends.map((b) => {
    const provider = new gcp.iam.WorkloadIdentityPoolProvider(`convex-wif-provider-${b.id}`, {
      workloadIdentityPoolId: wifPool.workloadIdentityPoolId,
      workloadIdentityPoolProviderId: `convex-provider-${b.id}`,
      displayName: `Convex OIDC Provider (${b.id})`,
      project,
      oidc: {
        issuerUri: b.convexSiteUrl,
        allowedAudiences: [project],
      },
      attributeMapping: {
        "google.subject": "assertion.sub",
        "attribute.convex_env": "assertion.convex_env",
      },
    });
    return { id: b.id, provider };
  });

  // GCP Service Account for cert-manager (DNS-01 challenges via Cloud DNS only)
  let certManagerServiceAccountEmail: pulumi.Output<string> | undefined;

  if (dnsProvider === "cloudDns") {
    const certManagerGcpSa = new gcp.serviceaccount.Account("cert-manager-sa", {
      accountId: "cert-manager-dns",
      displayName: "cert-manager DNS-01 Service Account",
      project,
    });

    // Grant DNS Admin role so cert-manager can create TXT records for ACME challenges
    new gcp.projects.IAMMember("certmanager-dns-admin", {
      project,
      role: "roles/dns.admin",
      member: pulumi.interpolate`serviceAccount:${certManagerGcpSa.email}`,
    });

    // Workload Identity binding: allow cert-manager K8s SA to impersonate GCP SA
    new gcp.serviceaccount.IAMBinding("certmanager-workload-identity", {
      serviceAccountId: certManagerGcpSa.name,
      role: "roles/iam.workloadIdentityUser",
      members: [
        pulumi.interpolate`serviceAccount:${project}.svc.id.goog[lifeos-system/cert-manager]`,
      ],
    });

    certManagerServiceAccountEmail = certManagerGcpSa.email;
  }

  return {
    gatewayGcpSa,
    wifPool,
    wifProviders,
    gatewayServiceAccountEmail: gatewayGcpSa.email,
    certManagerServiceAccountEmail,
  };
}
