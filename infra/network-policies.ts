import * as k8s from "@pulumi/kubernetes";

export function createNetworkPolicies(
  provider: k8s.Provider,
  usersNs: k8s.core.v1.Namespace,
  systemNs: k8s.core.v1.Namespace,
) {
  // User pods: allow egress only to AI Gateway ClusterIP and external internet
  const userPodEgress = new k8s.networking.v1.NetworkPolicy("user-pod-egress", {
    metadata: {
      name: "user-pod-egress",
      namespace: usersNs.metadata.name,
    },
    spec: {
      podSelector: {
        matchLabels: {
          "lifeos.app/role": "user-instance",
        },
      },
      policyTypes: ["Egress"],
      egress: [
        // Allow DNS resolution
        {
          ports: [
            { port: 53, protocol: "UDP" },
            { port: 53, protocol: "TCP" },
          ],
        },
        // Allow traffic to AI Gateway in lifeos-system namespace
        // Port 8080 = pod targetPort (GKE Dataplane V2 evaluates post-DNAT)
        {
          to: [{
            namespaceSelector: {
              matchLabels: { "kubernetes.io/metadata.name": "lifeos-system" },
            },
            podSelector: {
              matchLabels: { app: "ai-gateway" },
            },
          }],
          ports: [{ port: 8080, protocol: "TCP" }],
        },
        // Allow external internet (block private ranges)
        {
          to: [{
            ipBlock: {
              cidr: "0.0.0.0/0",
              except: [
                "10.0.0.0/8",
                "172.16.0.0/12",
                "192.168.0.0/16",
              ],
            },
          }],
        },
      ],
    },
  }, { provider, dependsOn: [usersNs] });

  // Deny all ingress to user namespace by default
  const userDefaultDeny = new k8s.networking.v1.NetworkPolicy("user-default-deny-ingress", {
    metadata: {
      name: "default-deny-ingress",
      namespace: usersNs.metadata.name,
    },
    spec: {
      podSelector: {},
      policyTypes: ["Ingress"],
      ingress: [],
    },
  }, { provider, dependsOn: [usersNs] });

  // Allow nginx-ingress to reach cert-manager ACME solver pods in user namespace
  const allowNginxToSolver = new k8s.networking.v1.NetworkPolicy("allow-nginx-to-solver", {
    metadata: {
      name: "allow-nginx-to-solver",
      namespace: usersNs.metadata.name,
    },
    spec: {
      podSelector: {
        matchLabels: {
          "acme.cert-manager.io/http01-solver": "true",
        },
      },
      policyTypes: ["Ingress"],
      ingress: [{
        from: [{
          namespaceSelector: {
            matchLabels: { "kubernetes.io/metadata.name": "lifeos-system" },
          },
        }],
        ports: [{ port: 8089, protocol: "TCP" }],
      }],
    },
  }, { provider, dependsOn: [usersNs] });

  // Allow nginx-ingress to reach user pods
  const allowNginxToUserPods = new k8s.networking.v1.NetworkPolicy("allow-nginx-to-user-pods", {
    metadata: {
      name: "allow-nginx-to-user-pods",
      namespace: usersNs.metadata.name,
    },
    spec: {
      podSelector: {
        matchLabels: {
          "lifeos.app/role": "user-instance",
        },
      },
      policyTypes: ["Ingress"],
      ingress: [{
        from: [{
          namespaceSelector: {
            matchLabels: { "kubernetes.io/metadata.name": "lifeos-system" },
          },
        }],
        ports: [
          { port: 18789, protocol: "TCP" },
          { port: 3001, protocol: "TCP" },
        ],
      }],
    },
  }, { provider, dependsOn: [usersNs] });

  return { userPodEgress, userDefaultDeny, allowNginxToSolver, allowNginxToUserPods };
}
