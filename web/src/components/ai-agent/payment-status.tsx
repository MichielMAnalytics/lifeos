'use client';

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { Badge } from "@/components/ui-clawnow/badge";
import { capture, EVENTS } from "@/lib/analytics";

export function PaymentStatus() {
  const [status, setStatus] = useState<string | null>(null);
  const settings = useQuery(api.deploymentSettings.getMySettings);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const sub = params.get("subscription");
    if (payment || sub) {
      setStatus(payment ?? sub ?? null);
      if (payment === "success" || sub === "success") {
        capture(EVENTS.PAYMENT_SUCCESS);
      }
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      url.searchParams.delete("subscription");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  if (!status) return null;

  const isSuccess = status === "success";
  const isPendingDeploy = isSuccess && settings?.pendingDeploy;

  return (
    <div className="max-w-2xl mx-auto mb-6">
      <Badge
        variant={isSuccess ? "success" : "warning"}
        className="h-auto px-3 py-2 text-xs w-full justify-between"
      >
        <span>
          {isPendingDeploy
            ? "Payment successful! Deploying your instance..."
            : isSuccess
              ? "Payment successful! Your account has been updated."
              : "Payment was cancelled."}
        </span>
        <button
          onClick={() => setStatus(null)}
          className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer ml-2"
        >
          Dismiss
        </button>
      </Badge>
    </div>
  );
}
