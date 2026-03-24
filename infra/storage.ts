import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

export function createStorageClass(provider: k8s.Provider, kmsKeyId: pulumi.Output<string>) {
  return new k8s.storage.v1.StorageClass("lifeos-encrypted", {
    metadata: { name: "lifeos-encrypted" },
    provisioner: "pd.csi.storage.gke.io",
    reclaimPolicy: "Retain",
    volumeBindingMode: "WaitForFirstConsumer",
    parameters: {
      type: "pd-balanced",
      "disk-encryption-kms-key": kmsKeyId as any,
    },
  }, { provider });
}
