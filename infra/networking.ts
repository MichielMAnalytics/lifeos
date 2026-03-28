import * as k8s from "@pulumi/kubernetes";
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

export function createNetworking(
  provider: k8s.Provider,
  systemNs: k8s.core.v1.Namespace,
  certManagerServiceAccountEmail: pulumi.Output<string> | undefined,
) {
  const config = new pulumi.Config("lifeos");
  const gcpConfig = new pulumi.Config("gcp");
  const domain = config.require("domain");
  const gcpProject = gcpConfig.require("project");
  const dnsZoneProject = config.get("dnsZoneProject") ?? gcpProject;
  const dnsProvider = config.get("dnsProvider") ?? "cloudDns";

  const wildcardSecretName = `wildcard-${domain.replace(/\./g, "-")}-tls`;

  // nginx-ingress controller (using Chart so sub-resources are first-class Pulumi resources)
  const nginxIngress = new k8s.helm.v3.Chart("nginx-ingress", {
    chart: "ingress-nginx",
    version: "4.11.3",
    fetchOpts: {
      repo: "https://kubernetes.github.io/ingress-nginx",
    },
    namespace: "lifeos-system",
    values: {
      controller: {
        service: {
          type: "LoadBalancer",
          annotations: {
            "cloud.google.com/neg": '{"ingress": true}',
          },
        },
        config: {
          "use-forwarded-headers": "true",
          "proxy-body-size": "8m",
          "proxy-read-timeout": "300",
          "proxy-send-timeout": "300",
          "allow-snippet-annotations": "true",
        },
        extraArgs: {
          "default-ssl-certificate": `lifeos-system/${wildcardSecretName}`,
        },
        resources: {
          requests: {
            cpu: "100m",
            memory: "128Mi",
          },
        },
      },
    },
    // Force SSA ownership for resources previously managed by the Helm Release
    transformations: [
      (obj: any) => {
        if (!obj.metadata) obj.metadata = {};
        if (!obj.metadata.annotations) obj.metadata.annotations = {};
        obj.metadata.annotations["pulumi.com/patchForce"] = "true";
      },
    ],
  }, { provider, dependsOn: [systemNs] });

  // cert-manager for TLS certificates
  const certManagerValues: Record<string, any> = {
    crds: {
      enabled: true,
    },
    global: {
      leaderElection: {
        namespace: "lifeos-system",
      },
    },
    serviceAccount: {
      name: "cert-manager",
      ...(certManagerServiceAccountEmail ? {
        annotations: {
          "iam.gke.io/gcp-service-account": certManagerServiceAccountEmail,
        },
      } : {}),
    },
    extraArgs: [
      "--acme-http01-solver-nameservers=8.8.8.8:53",
    ],
  };

  const certManager = new k8s.helm.v3.Release("cert-manager", {
    chart: "cert-manager",
    version: "v1.16.2",
    repositoryOpts: {
      repo: "https://charts.jetstack.io",
    },
    namespace: systemNs.metadata.name,
    values: certManagerValues,
  }, { provider, dependsOn: [systemNs] });

  // GoDaddy webhook for cert-manager (when using GoDaddy DNS)
  let godaddyWebhookDeps: pulumi.Resource[] = [];
  if (dnsProvider === "godaddy") {
    const godaddyApiKey = config.requireSecret("godaddyApiKey");
    const godaddyApiSecret = config.requireSecret("godaddyApiSecret");

    // K8s Secret with GoDaddy API credentials
    const godaddySecret = new k8s.core.v1.Secret("godaddy-api-credentials", {
      metadata: {
        name: "godaddy-api-credentials",
        namespace: "lifeos-system",
      },
      stringData: {
        token: pulumi.interpolate`${godaddyApiKey}:${godaddyApiSecret}`,
      },
    }, { provider, dependsOn: [systemNs] });

    // GoDaddy webhook Helm chart for cert-manager DNS-01 solver
    const godaddyWebhook = new k8s.helm.v3.Release("godaddy-webhook", {
      chart: "godaddy-webhook",
      repositoryOpts: {
        repo: "https://snowdrop.github.io/godaddy-webhook",
      },
      namespace: systemNs.metadata.name,
      values: {
        groupName: "acme.lifeos.io",
        certManager: {
          namespace: "lifeos-system",
          serviceAccountName: "cert-manager",
        },
      },
    }, { provider, dependsOn: [certManager, systemNs] });

    godaddyWebhookDeps = [godaddyWebhook, godaddySecret];
  }

  // Build DNS-01 solver based on provider
  const dns01Solver = dnsProvider === "godaddy"
    ? {
        selector: {
          dnsZones: [domain],
        },
        dns01: {
          webhook: {
            solverName: "godaddy",
            groupName: "acme.lifeos.io",
            config: {
              apiKeySecretRef: {
                name: "godaddy-api-credentials",
                key: "token",
              },
              production: true,
              ttl: 600,
            },
          },
        },
      }
    : {
        selector: {
          dnsZones: [domain],
        },
        dns01: {
          cloudDNS: {
            project: dnsZoneProject,
          },
        },
      };

  // Let's Encrypt ClusterIssuer (production)
  const letsEncryptIssuer = new k8s.apiextensions.CustomResource("letsencrypt-prod", {
    apiVersion: "cert-manager.io/v1",
    kind: "ClusterIssuer",
    metadata: {
      name: "letsencrypt-prod",
    },
    spec: {
      acme: {
        server: "https://acme-v02.api.letsencrypt.org/directory",
        email: pulumi.interpolate`admin@${domain}`,
        privateKeySecretRef: {
          name: "letsencrypt-prod-account-key",
        },
        solvers: [
          // DNS-01 solver for the user-deployment domain (required for wildcard)
          dns01Solver,
          // HTTP-01 fallback for any non-wildcard domains
          {
            http01: {
              ingress: { class: "nginx" },
            },
          },
        ],
      },
    },
  }, { provider, dependsOn: [certManager, ...godaddyWebhookDeps] });

  // Wildcard certificate for *.{domain}
  const wildcardCert = new k8s.apiextensions.CustomResource("wildcard-cert", {
    apiVersion: "cert-manager.io/v1",
    kind: "Certificate",
    metadata: {
      name: `wildcard-${domain.replace(/\./g, "-")}`,
      namespace: "lifeos-system",
    },
    spec: {
      secretName: wildcardSecretName,
      issuerRef: {
        name: "letsencrypt-prod",
        kind: "ClusterIssuer",
      },
      dnsNames: [
        domain,
        `*.${domain}`,
      ],
    },
  }, { provider, dependsOn: [letsEncryptIssuer] });

  // Get the nginx ingress LoadBalancer IP directly from the Chart's sub-resources
  const ingressService = nginxIngress.getResource("v1/Service", "lifeos-system", "nginx-ingress-ingress-nginx-controller");

  const ingressIp = ingressService.apply(svc => svc?.status).apply(
    s => s?.loadBalancer?.ingress?.[0]?.ip ?? "",
  );

  // Cloud DNS managed zone (only when using Cloud DNS provider)
  let dnsZone: gcp.dns.ManagedZone | undefined;
  if (dnsProvider === "cloudDns") {
    dnsZone = new gcp.dns.ManagedZone("lifeos-zone", {
      name: "lifeos-zone",
      dnsName: `${domain}.`,
      description: "Claw Now DNS zone",
    });

    // A record for root domain
    new gcp.dns.RecordSet("lifeos-a-record", {
      name: `${domain}.`,
      type: "A",
      ttl: 300,
      managedZone: dnsZone.name,
      rrdatas: [ingressIp],
    });

    // Wildcard A record
    new gcp.dns.RecordSet("lifeos-wildcard-a-record", {
      name: `*.${domain}.`,
      type: "A",
      ttl: 300,
      managedZone: dnsZone.name,
      rrdatas: [ingressIp],
    });
  }

  return {
    nginxIngress,
    certManager,
    letsEncryptIssuer,
    wildcardCert,
    dnsZone,
    ingressIp,
  };
}
