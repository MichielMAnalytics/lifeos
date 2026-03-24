import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { BackendConfig } from "./backends";

export function createGateway(
  provider: k8s.Provider,
  systemNs: k8s.core.v1.Namespace,
  gatewayServiceAccount: pulumi.Output<string>,
  openclawImageTag: string,
  gatewayImageName: string,
  backend: BackendConfig,
  redisUrl: pulumi.Output<string>,
) {
  const config = new pulumi.Config("lifeos");
  const gcpConfig = new pulumi.Config("gcp");
  const gcpProject = gcpConfig.require("project");
  const id = backend.id;

  const labels = { app: "ai-gateway", component: "gateway", "lifeos.app/backend-id": id };
  const selectorLabels = { app: "ai-gateway", "lifeos.app/backend-id": id };

  const deployment = new k8s.apps.v1.Deployment(`ai-gateway-${id}`, {
    metadata: {
      name: `ai-gateway-${id}`,
      namespace: systemNs.metadata.name,
      labels,
      annotations: {
        "pulumi.com/patchForce": "true",
      },
    },
    spec: {
      replicas: 2,
      selector: {
        matchLabels: selectorLabels,
      },
      template: {
        metadata: {
          labels,
          annotations: {
            "iam.gke.io/gcp-service-account": gatewayServiceAccount,
          },
        },
        spec: {
          serviceAccountName: `ai-gateway-${id}`,
          containers: [{
            name: "ai-gateway",
            image: gatewayImageName,
            ports: [
              { containerPort: 8080, name: "http" },
            ],
            env: [
              {
                name: "REDIS_URL",
                value: redisUrl,
              },
              {
                name: "PORT",
                value: "8080",
              },
              {
                name: "GATEWAY_INSTANCE_ID",
                value: id,
              },
              {
                name: "GATEWAY_SYSTEM_KEY",
                valueFrom: {
                  secretKeyRef: {
                    name: "lifeos-system-secrets",
                    key: "gateway-system-key",
                  },
                },
              },
              {
                name: "JWT_SIGNING_KEY",
                valueFrom: {
                  secretKeyRef: {
                    name: "lifeos-system-secrets",
                    key: "jwt-signing-key",
                  },
                },
              },
              {
                name: "CONVEX_SITE_URL",
                value: backend.convexSiteUrl,
              },
              {
                name: "ANTHROPIC_API_KEY",
                valueFrom: {
                  secretKeyRef: {
                    name: "lifeos-system-secrets",
                    key: "anthropic-api-key",
                  },
                },
              },
              {
                name: "OPENAI_API_KEY",
                valueFrom: {
                  secretKeyRef: {
                    name: "lifeos-system-secrets",
                    key: "openai-api-key",
                  },
                },
              },
              {
                name: "GCP_PROJECT_ID",
                value: gcpProject,
              },
            ],
            resources: {
              requests: {
                cpu: "200m",
                memory: "256Mi",
              },
              limits: {
                memory: "512Mi",
              },
            },
            livenessProbe: {
              httpGet: {
                path: "/health",
                port: 8080,
              },
              initialDelaySeconds: 10,
              periodSeconds: 15,
              timeoutSeconds: 5,
            },
            readinessProbe: {
              httpGet: {
                path: "/ready",
                port: 8080,
              },
              initialDelaySeconds: 5,
              periodSeconds: 5,
              timeoutSeconds: 3,
            },
          }],
        },
      },
    },
  }, { provider, dependsOn: [systemNs] });

  // ClusterIP Service for internal access (/v1/* + /register)
  const service = new k8s.core.v1.Service(`ai-gateway-${id}`, {
    metadata: {
      name: `ai-gateway-${id}`,
      namespace: systemNs.metadata.name,
      labels,
    },
    spec: {
      type: "ClusterIP",
      selector: selectorLabels,
      ports: [{
        port: 80,
        targetPort: 8080,
        name: "http",
      }],
    },
  }, { provider, dependsOn: [systemNs] });

  // Kubernetes ServiceAccount with Workload Identity annotation
  const k8sSa = new k8s.core.v1.ServiceAccount(`ai-gateway-sa-${id}`, {
    metadata: {
      name: `ai-gateway-${id}`,
      namespace: systemNs.metadata.name,
      annotations: {
        "iam.gke.io/gcp-service-account": gatewayServiceAccount,
      },
    },
  }, { provider, dependsOn: [systemNs] });

  // Ingress for external access to /internal routes (called by Convex for balance/user management)
  const domain = config.require("domain");
  const ingress = new k8s.networking.v1.Ingress(`ai-gateway-internal-${id}`, {
    metadata: {
      name: `ai-gateway-internal-${id}`,
      namespace: systemNs.metadata.name,
      annotations: {
        "kubernetes.io/ingress.class": "nginx",
      },
    },
    spec: {
      rules: [{
        host: `gw-${id}.${domain}`,
        http: {
          paths: [
            {
              path: "/internal",
              pathType: "Prefix",
              backend: {
                service: {
                  name: `ai-gateway-${id}`,
                  port: { number: 80 },
                },
              },
            },
            {
              path: "/auth",
              pathType: "Prefix",
              backend: {
                service: {
                  name: `ai-gateway-${id}`,
                  port: { number: 80 },
                },
              },
            },
          ],
        },
      }],
    },
  }, { provider, dependsOn: [systemNs] });

  // Role + RoleBinding in lifeos-users namespace so the AI Gateway can exec into user pods
  const execRole = new k8s.rbac.v1.Role(`ai-gateway-exec-role-${id}`, {
    metadata: {
      name: `ai-gateway-exec-${id}`,
      namespace: "lifeos-users",
    },
    rules: [
      { apiGroups: [""], resources: ["pods"], verbs: ["get"] },
      { apiGroups: [""], resources: ["pods/exec"], verbs: ["get", "create"] },
    ],
  }, { provider });

  const execRoleBinding = new k8s.rbac.v1.RoleBinding(`ai-gateway-exec-binding-${id}`, {
    metadata: {
      name: `ai-gateway-exec-${id}`,
      namespace: "lifeos-users",
    },
    subjects: [{
      kind: "ServiceAccount",
      name: `ai-gateway-${id}`,
      namespace: "lifeos-system",
    }],
    roleRef: {
      apiGroup: "rbac.authorization.k8s.io",
      kind: "Role",
      name: `ai-gateway-exec-${id}`,
    },
  }, { provider, dependsOn: [execRole, k8sSa] });

  return { deployment, service, k8sSa, ingress, execRole, execRoleBinding };
}
