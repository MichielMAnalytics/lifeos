import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { BackendConfig } from "./backends";

/** Shared RBAC resources — created once for all reconcilers */
export function createReconcilerRBAC(
  provider: k8s.Provider,
  systemNs: k8s.core.v1.Namespace,
) {
  // ServiceAccount for reconciler with RBAC to manage user pods
  const sa = new k8s.core.v1.ServiceAccount("reconciler-sa", {
    metadata: {
      name: "reconciler",
      namespace: systemNs.metadata.name,
    },
  }, { provider, dependsOn: [systemNs] });

  // ClusterRole for managing pods in lifeos-users namespace
  const clusterRole = new k8s.rbac.v1.ClusterRole("reconciler-role", {
    metadata: { name: "reconciler" },
    rules: [
      {
        apiGroups: [""],
        resources: ["pods", "services", "configmaps", "persistentvolumeclaims"],
        verbs: ["get", "list", "watch", "create", "update", "patch", "delete"],
      },
      {
        apiGroups: ["apps"],
        resources: ["deployments", "statefulsets"],
        verbs: ["get", "list", "watch", "create", "update", "patch", "delete"],
      },
      {
        apiGroups: ["networking.k8s.io"],
        resources: ["networkpolicies"],
        verbs: ["get", "list", "watch", "create", "update", "patch", "delete"],
      },
    ],
  }, { provider });

  const clusterRoleBinding = new k8s.rbac.v1.ClusterRoleBinding("reconciler-binding", {
    metadata: { name: "reconciler" },
    subjects: [{
      kind: "ServiceAccount",
      name: "reconciler",
      namespace: "lifeos-system",
    }],
    roleRef: {
      apiGroup: "rbac.authorization.k8s.io",
      kind: "ClusterRole",
      name: "reconciler",
    },
  }, { provider, dependsOn: [clusterRole, sa] });

  return { sa, clusterRole, clusterRoleBinding };
}

/** Per-backend reconciler CronJob */
export function createReconciler(
  provider: k8s.Provider,
  systemNs: k8s.core.v1.Namespace,
  backend: BackendConfig,
  rbac: ReturnType<typeof createReconcilerRBAC>,
) {
  const id = backend.id;
  const labels = { app: "reconciler", component: "control-plane", "lifeos.app/backend-id": id };

  // CronJob that runs every 5 minutes
  const cronJob = new k8s.batch.v1.CronJob(`reconciler-${id}`, {
    metadata: {
      name: `reconciler-${id}`,
      namespace: systemNs.metadata.name,
      labels,
    },
    spec: {
      schedule: "*/5 * * * *",
      concurrencyPolicy: "Forbid",
      successfulJobsHistoryLimit: 3,
      failedJobsHistoryLimit: 3,
      jobTemplate: {
        spec: {
          activeDeadlineSeconds: 240,
          backoffLimit: 2,
          template: {
            metadata: { labels },
            spec: {
              serviceAccountName: "reconciler",
              restartPolicy: "OnFailure",
              containers: [{
                name: "reconciler",
                image: "alpine:3.20",
                command: ["/bin/sh", "-c"],
                args: [pulumi.interpolate`
set -e

# Install dependencies
apk add --no-cache curl kubectl jq > /dev/null 2>&1

CONVEX_SITE_URL="${backend.convexSiteUrl}"
GATEWAY_SYSTEM_KEY=$(cat /etc/secrets/gateway-system-key)
BACKEND_ID="${id}"

# Fetch desired state from Convex
echo "[$BACKEND_ID] Fetching desired state from Convex..."
DESIRED=$(curl -sf -H "Authorization: Bearer $GATEWAY_SYSTEM_KEY" \
  "$CONVEX_SITE_URL/api/getDesiredState" || echo "")

if [ -z "$DESIRED" ]; then
  echo "[$BACKEND_ID] ERROR: Failed to fetch desired state"
  exit 1
fi

# Get actual state from Kubernetes — only pods belonging to this backend
echo "[$BACKEND_ID] Fetching actual state from Kubernetes..."
ACTUAL_PODS=$(kubectl get deployments -n lifeos-users -l "lifeos.app/backend-id=$BACKEND_ID" -o json 2>/dev/null || echo '{"items":[]}')

# Parse desired deployments
DESIRED_IDS=$(echo "$DESIRED" | jq -r '.instances[]?.id // empty')
ACTUAL_IDS=$(echo "$ACTUAL_PODS" | jq -r '.items[]?.metadata.labels["lifeos.app/instance-id"] // empty')

# Create missing deployments
for ID in $DESIRED_IDS; do
  if ! echo "$ACTUAL_IDS" | grep -q "^$ID$"; then
    echo "[$BACKEND_ID] Creating deployment for instance $ID..."
    INSTANCE=$(echo "$DESIRED" | jq -r ".instances[] | select(.id == \"$ID\")")
    IMAGE=$(echo "$INSTANCE" | jq -r '.image // "openclaw:latest"')
    CHANNEL=$(echo "$INSTANCE" | jq -r '.channel // "telegram"')
    USER_ID=$(echo "$INSTANCE" | jq -r '.userId')

    kubectl apply -n lifeos-users -f - <<DEPLOY
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openclaw-$ID
  labels:
    lifeos.app/instance-id: "$ID"
    lifeos.app/role: user-instance
    lifeos.app/channel: "$CHANNEL"
    lifeos.app/user-id: "$USER_ID"
    lifeos.app/backend-id: "$BACKEND_ID"
spec:
  replicas: 1
  selector:
    matchLabels:
      lifeos.app/instance-id: "$ID"
  template:
    metadata:
      labels:
        lifeos.app/instance-id: "$ID"
        lifeos.app/role: user-instance
        lifeos.app/channel: "$CHANNEL"
        lifeos.app/backend-id: "$BACKEND_ID"
    spec:
      containers:
      - name: openclaw
        image: $IMAGE
        env:
        - name: INSTANCE_ID
          value: "$ID"
        - name: CHANNEL
          value: "$CHANNEL"
        - name: AI_GATEWAY_URL
          value: "http://ai-gateway-${id}.lifeos-system.svc.cluster.local"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            memory: 256Mi
DEPLOY
  fi
done

# Remove deployments that should no longer exist
for ID in $ACTUAL_IDS; do
  if [ -n "$ID" ] && ! echo "$DESIRED_IDS" | grep -q "^$ID$"; then
    echo "[$BACKEND_ID] Removing deployment for instance $ID..."
    kubectl delete deployment "openclaw-$ID" -n lifeos-users --ignore-not-found
  fi
done

echo "[$BACKEND_ID] Reconciliation complete."
`],
                volumeMounts: [{
                  name: "secrets",
                  mountPath: "/etc/secrets",
                  readOnly: true,
                }],
                resources: {
                  requests: {
                    cpu: "50m",
                    memory: "64Mi",
                  },
                  limits: {
                    memory: "128Mi",
                  },
                },
              }],
              volumes: [{
                name: "secrets",
                secret: {
                  secretName: "lifeos-system-secrets",
                  items: [
                    { key: "gateway-system-key", path: "gateway-system-key" },
                  ],
                },
              }],
            },
          },
        },
      },
    },
  }, { provider, dependsOn: [systemNs, rbac.clusterRoleBinding] });

  return { cronJob };
}
