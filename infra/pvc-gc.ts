import * as k8s from "@pulumi/kubernetes";

export function createPvcGarbageCollector(
  provider: k8s.Provider,
  systemNs: k8s.core.v1.Namespace,
) {
  const labels = { app: "pvc-gc", component: "maintenance" };

  // ServiceAccount for PVC GC
  const sa = new k8s.core.v1.ServiceAccount("pvc-gc-sa", {
    metadata: {
      name: "pvc-gc",
      namespace: systemNs.metadata.name,
    },
  }, { provider, dependsOn: [systemNs] });

  // ClusterRole for managing PVCs
  const clusterRole = new k8s.rbac.v1.ClusterRole("pvc-gc-role", {
    metadata: { name: "pvc-gc" },
    rules: [{
      apiGroups: [""],
      resources: ["persistentvolumeclaims"],
      verbs: ["get", "list", "delete"],
    }],
  }, { provider });

  const clusterRoleBinding = new k8s.rbac.v1.ClusterRoleBinding("pvc-gc-binding", {
    metadata: { name: "pvc-gc" },
    subjects: [{
      kind: "ServiceAccount",
      name: "pvc-gc",
      namespace: "lifeos-system",
    }],
    roleRef: {
      apiGroup: "rbac.authorization.k8s.io",
      kind: "ClusterRole",
      name: "pvc-gc",
    },
  }, { provider, dependsOn: [clusterRole, sa] });

  // CronJob that runs daily at 3am UTC
  const cronJob = new k8s.batch.v1.CronJob("pvc-gc", {
    metadata: {
      name: "pvc-gc",
      namespace: systemNs.metadata.name,
      labels,
    },
    spec: {
      schedule: "0 3 * * *",
      concurrencyPolicy: "Forbid",
      successfulJobsHistoryLimit: 3,
      failedJobsHistoryLimit: 3,
      jobTemplate: {
        spec: {
          activeDeadlineSeconds: 300,
          backoffLimit: 1,
          template: {
            metadata: { labels },
            spec: {
              serviceAccountName: "pvc-gc",
              restartPolicy: "OnFailure",
              containers: [{
                name: "pvc-gc",
                image: "alpine:3.20",
                command: ["/bin/sh", "-c"],
                args: [`
set -e

# Install kubectl
apk add --no-cache kubectl jq > /dev/null 2>&1

NOW=$(date +%s)

echo "Starting PVC garbage collection at $(date -u)..."

# List all PVCs in lifeos-users namespace with deactivate-after label
PVCS=$(kubectl get pvc -n lifeos-users -l "lifeos.app/deactivate-after" -o json 2>/dev/null || echo '{"items":[]}')

TOTAL=$(echo "$PVCS" | jq '.items | length')
DELETED=0

echo "Found $TOTAL PVCs with deactivate-after label."

echo "$PVCS" | jq -r '.items[] | .metadata.name + " " + .metadata.labels["lifeos.app/deactivate-after"]' | while read -r PVC_NAME DEACTIVATE_AFTER; do
  if [ -z "$PVC_NAME" ] || [ -z "$DEACTIVATE_AFTER" ]; then
    continue
  fi

  # deactivate-after is a Unix timestamp
  if [ "$NOW" -gt "$DEACTIVATE_AFTER" ] 2>/dev/null; then
    echo "Deleting expired PVC: $PVC_NAME (expired at $DEACTIVATE_AFTER)"
    kubectl delete pvc "$PVC_NAME" -n lifeos-users
    DELETED=$((DELETED + 1))
  else
    echo "PVC $PVC_NAME not yet expired (expires at $DEACTIVATE_AFTER)"
  fi
done

echo "PVC garbage collection complete. Deleted $DELETED PVCs."
`],
                resources: {
                  requests: {
                    cpu: "50m",
                    memory: "32Mi",
                  },
                  limits: {
                    memory: "64Mi",
                  },
                },
              }],
            },
          },
        },
      },
    },
  }, { provider, dependsOn: [systemNs, clusterRoleBinding] });

  return { cronJob, sa, clusterRole, clusterRoleBinding };
}
