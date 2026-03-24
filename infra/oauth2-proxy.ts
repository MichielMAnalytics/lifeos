import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

export function createOAuth2Proxy(
  provider: k8s.Provider,
  systemNs: k8s.core.v1.Namespace,
) {
  const config = new pulumi.Config("lifeos");
  const domain = config.require("domain");

  const clientId = config.requireSecret("oauth2ProxyClientId");
  const clientSecret = config.requireSecret("oauth2ProxyClientSecret");
  const cookieSecret = config.requireSecret("oauth2ProxyCookieSecret");

  const labels = { app: "oauth2-proxy" };

  const secret = new k8s.core.v1.Secret("oauth2-proxy-secrets", {
    metadata: {
      name: "oauth2-proxy-secrets",
      namespace: systemNs.metadata.name,
    },
    stringData: {
      "client-id": clientId,
      "client-secret": clientSecret,
      "cookie-secret": cookieSecret,
    },
  }, { provider, dependsOn: [systemNs] });

  const deployment = new k8s.apps.v1.Deployment("oauth2-proxy", {
    metadata: {
      name: "oauth2-proxy",
      namespace: systemNs.metadata.name,
      labels,
      annotations: {
        "pulumi.com/patchForce": "true",
      },
    },
    spec: {
      replicas: 2,
      selector: { matchLabels: labels },
      template: {
        metadata: { labels },
        spec: {
          containers: [{
            name: "oauth2-proxy",
            image: "quay.io/oauth2-proxy/oauth2-proxy:v7.7.1",
            args: [
              "--provider=google",
              "--email-domain=*",
              `--cookie-domain=.${domain}`,
              "--cookie-name=_lifeos_auth",
              `--redirect-url=https://auth.${domain}/oauth2/callback`,
              "--upstream=static://200",
              "--skip-provider-button=true",
              "--reverse-proxy=true",
              "--set-xauthrequest=true",
              `--whitelist-domain=.${domain}`,
              "--http-address=0.0.0.0:4180",
            ],
            env: [
              {
                name: "OAUTH2_PROXY_CLIENT_ID",
                valueFrom: { secretKeyRef: { name: "oauth2-proxy-secrets", key: "client-id" } },
              },
              {
                name: "OAUTH2_PROXY_CLIENT_SECRET",
                valueFrom: { secretKeyRef: { name: "oauth2-proxy-secrets", key: "client-secret" } },
              },
              {
                name: "OAUTH2_PROXY_COOKIE_SECRET",
                valueFrom: { secretKeyRef: { name: "oauth2-proxy-secrets", key: "cookie-secret" } },
              },
            ],
            ports: [{ containerPort: 4180, name: "http" }],
            resources: {
              requests: { cpu: "50m", memory: "64Mi" },
              limits: { memory: "128Mi" },
            },
            livenessProbe: {
              httpGet: { path: "/ping", port: 4180 },
              initialDelaySeconds: 5,
              periodSeconds: 15,
            },
            readinessProbe: {
              httpGet: { path: "/ready", port: 4180 },
              initialDelaySeconds: 3,
              periodSeconds: 5,
            },
          }],
        },
      },
    },
  }, { provider, dependsOn: [systemNs, secret] });

  const service = new k8s.core.v1.Service("oauth2-proxy", {
    metadata: {
      name: "oauth2-proxy",
      namespace: systemNs.metadata.name,
      labels,
    },
    spec: {
      type: "ClusterIP",
      selector: labels,
      ports: [{ port: 80, targetPort: 4180, name: "http" }],
    },
  }, { provider, dependsOn: [systemNs] });

  // Ingress for auth.{domain}/oauth2 — uses its own cert via HTTP-01
  const ingress = new k8s.networking.v1.Ingress("oauth2-proxy", {
    metadata: {
      name: "oauth2-proxy",
      namespace: systemNs.metadata.name,
      annotations: {
        "kubernetes.io/ingress.class": "nginx",
      },
    },
    spec: {
      rules: [{
        host: `auth.${domain}`,
        http: {
          paths: [{
            path: "/oauth2",
            pathType: "Prefix",
            backend: {
              service: {
                name: "oauth2-proxy",
                port: { number: 80 },
              },
            },
          }],
        },
      }],
    },
  }, { provider, dependsOn: [systemNs] });

  return { deployment, service, secret, ingress };
}
