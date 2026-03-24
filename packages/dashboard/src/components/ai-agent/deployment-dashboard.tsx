'use client';

import { useAction } from "convex/react";
import { api } from "@/lib/convex-api";
import { useState, useEffect, useRef } from "react";
import {
  ExternalLink,
  Eye,
  EyeOff,
  Copy,
  Check,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui-clawnow/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui-clawnow/card";
import { Badge } from "@/components/ui-clawnow/badge";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui-clawnow/dialog";
import { capture, EVENTS } from "@/lib/analytics";
import type { DeploymentStatus } from "@/components/ai-agent/types";

function StatusBadge({ status }: { status: DeploymentStatus }) {
  const variantMap: Record<
    DeploymentStatus,
    "success" | "warning" | "destructive" | "secondary"
  > = {
    provisioning: "warning",
    starting: "warning",
    running: "success",
    error: "destructive",
    deactivating: "secondary",
    deactivated: "secondary",
    suspended: "secondary",
  };

  const labels: Record<DeploymentStatus, string> = {
    provisioning: "Provisioning",
    starting: "Starting",
    running: "Running",
    error: "Error",
    deactivating: "Shutting Down",
    deactivated: "Deactivated",
    suspended: "Suspended",
  };

  return (
    <Badge variant={variantMap[status]}>
      {(status === "provisioning" || status === "starting" || status === "deactivating") && (
        <Loader2 className="size-3 animate-spin" />
      )}
      {status === "running" && (
        <span className="size-1.5 rounded-full bg-success" />
      )}
      {status === "error" && (
        <span className="size-1.5 rounded-full bg-danger" />
      )}
      {labels[status]}
    </Badge>
  );
}

function DeployTimer({
  startTime,
  status,
}: {
  startTime: number;
  status: "provisioning" | "starting";
}) {
  const pinnedStart = useRef(startTime);
  const [elapsed, setElapsed] = useState(0);
  const maxSeconds = 60;

  useEffect(() => {
    const update = () => {
      const secs = Math.floor((Date.now() - pinnedStart.current) / 1000);
      setElapsed(Math.min(Math.max(secs, 0), maxSeconds));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const capped = elapsed >= maxSeconds;
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const progress = Math.min(elapsed / maxSeconds, 1);

  return (
    <div className="space-y-3 py-3 px-4 bg-surface/50">
      {capped ? (
        <>
          <div className="flex items-center gap-3">
            <Loader2 className="size-4 animate-spin text-text-muted" />
            <p className="text-xs text-text-muted">Finalizing last details...</p>
          </div>
          <div className="h-1 bg-text/5 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-accent/60 rounded-full animate-[indeterminate_1.5s_ease-in-out_infinite]" />
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="size-4 animate-spin text-text-muted" />
              <p className="text-xs text-text-muted">
                {status === "provisioning"
                  ? "Setting up your instance..."
                  : "Starting your instance..."}
              </p>
            </div>
            <span className="font-mono text-xs tabular-nums text-text">
              {display}
            </span>
          </div>
          <div className="h-1 bg-text/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent/60 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}

export function DeploymentDashboard({
  deployment,
}: {
  deployment: {
    _id: string;
    subdomain: string;
    gatewayToken: string;
    status: DeploymentStatus;
    errorMessage?: string;
    createdAt: number;
    lastUpdatedAt: number;
  };
}) {
  const deactivate = useAction(api.deploymentActions.deactivate);
  const deploy = useAction(api.deploymentActions.deploy);
  const restartInstance = useAction(api.deploymentActions.restart);
  const billingPortal = useAction(api.stripe.createBillingPortalSession);
  const [showToken, setShowToken] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const domain = process.env.NEXT_PUBLIC_LIFEOS_DOMAIN ?? "lifeos.app";
  const cockpitUrl = `https://${deployment.subdomain}.${domain}/_/setup#token=${encodeURIComponent(deployment.gatewayToken)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(deployment.gatewayToken);
    setCopied(true);
    capture(EVENTS.TOKEN_COPIED);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeactivate = async () => {
    setActionLoading(true);
    try {
      setShowConfirm(false);
      await deactivate({});
      capture(EVENTS.DEPLOYMENT_DEACTIVATED);
    } catch (e) {
      console.error("Deactivate error:", e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    setActionLoading(true);
    try {
      await deactivate({});
      await deploy({});
      capture(EVENTS.DEPLOYMENT_REDEPLOYED);
    } catch (e) {
      console.error("Retry error:", e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenew = async () => {
    setActionLoading(true);
    try {
      const { url } = await billingPortal({});
      window.location.href = url;
    } catch (e) {
      console.error("Billing portal error:", e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestart = async () => {
    setActionLoading(true);
    try {
      await restartInstance({});
      capture(EVENTS.INSTANCE_RESTARTED);
    } catch (e) {
      console.error("Restart error:", e);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      {/* Status Card */}
      <Card className="ring-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your Instance</CardTitle>
            <StatusBadge status={deployment.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Cockpit Link — primary CTA */}
          {deployment.status === "running" && (
            <a href={cockpitUrl} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="w-full h-11 text-sm gap-2.5 bg-white text-black hover:bg-white/90 animate-[breathe_3s_ease-in-out_infinite]">
                <ExternalLink className="size-4" />
                Open Cockpit
              </Button>
            </a>
          )}

          {/* Provisioning / Starting — live timer */}
          {(deployment.status === "provisioning" || deployment.status === "starting") && (
            <DeployTimer startTime={deployment.lastUpdatedAt} status={deployment.status} />
          )}

          {/* Error state */}
          {deployment.status === "error" && (
            <div className="space-y-3">
              <p className="text-xs text-danger">
                {deployment.errorMessage ?? "An unexpected error occurred."}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleRetry}
                  disabled={actionLoading}
                  size="sm"
                >
                  {actionLoading ? "Retrying..." : "Retry"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowConfirm(true)}
                  disabled={actionLoading}
                  size="sm"
                >
                  Destroy
                </Button>
              </div>
            </div>
          )}

          {/* Suspended state */}
          {deployment.status === "suspended" && (
            <div className="space-y-3">
              <p className="text-xs text-text-muted">
                Your instance has been suspended because your subscription is no longer active. Renew to get back online.
              </p>
              <Button
                onClick={handleRenew}
                disabled={actionLoading}
                loading={actionLoading}
                className="w-full"
              >
                Renew Subscription
              </Button>
            </div>
          )}

          {/* Connection Details — collapsible, only when running */}
          {deployment.status === "running" && (
            <details className="group border-t border-text/5 pt-4">
              <summary className="flex items-center gap-1.5 cursor-pointer text-[10px] font-medium text-text-muted/60 hover:text-text-muted uppercase tracking-wider select-none list-none [&::-webkit-details-marker]:hidden transition-colors">
                <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
                Details
              </summary>
              <div className="mt-4 space-y-4">
                {/* Gateway Token */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                    Gateway Token
                  </h3>
                  <div className="flex items-center gap-1">
                    <code className="flex-1 text-[11px] font-mono text-text-muted bg-bg ring-1 ring-text/10 px-3 py-2 truncate">
                      {showToken
                        ? deployment.gatewayToken
                        : "claw_" + "\u2022".repeat(20)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowToken(!showToken)}
                      className="shrink-0"
                    >
                      {showToken ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Eye className="size-3.5" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleCopy} className="shrink-0">
                      {copied ? (
                        <Check className="size-3.5 text-success" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Endpoint */}
                <div className="space-y-1.5">
                  <h3 className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                    Endpoint
                  </h3>
                  <code className="block text-[11px] text-text-muted font-mono bg-bg ring-1 ring-text/10 px-3 py-2">
                    {deployment.subdomain}.{process.env.NEXT_PUBLIC_LIFEOS_DOMAIN ?? "lifeos.app"}
                  </code>
                </div>

                {/* Restart & Destroy */}
                <div className="pt-4 border-t border-text/5 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-text-muted"
                    onClick={handleRestart}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Restarting..." : "Restart Instance"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-text-muted hover:text-danger"
                    onClick={() => setShowConfirm(true)}
                    disabled={actionLoading}
                  >
                    Destroy Instance
                  </Button>
                </div>
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Destroy Confirmation Dialog */}
      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)}>
        <DialogHeader>
          <DialogTitle>Destroy Instance</DialogTitle>
          <DialogDescription>
            Are you sure you want to destroy your instance? This action cannot be
            undone. Your data will be retained for 30 days.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeactivate}
            disabled={actionLoading}
            loading={actionLoading}
          >
            {actionLoading ? "Destroying..." : "Confirm Destroy"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfirm(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </Dialog>

    </>
  );
}
