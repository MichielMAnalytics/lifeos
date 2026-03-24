'use client';

import { useQuery, useAction } from "convex/react";
import { api } from "@/lib/convex-api";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui-clawnow/button";
import { cn } from "@/lib/utils";
import { capture, EVENTS } from "@/lib/analytics";

export function SubscriptionPicker({
  preferredPlan,
  filterByApiKeySource,
  onRequestChangeKeys,
}: {
  preferredPlan?: string | null;
  filterByApiKeySource?: "ours" | "byok" | null;
  onRequestChangeKeys?: (targetApiKeySource: "ours" | "byok") => void;
}) {
  const plans = useQuery(api.stripe.getSubscriptionPlansList);
  const checkout = useAction(api.stripeCheckout.createSubscriptionCheckout);
  const [loading, setLoading] = useState<string | null>(null);

  // Clear consumed pref
  useEffect(() => {
    if (preferredPlan) sessionStorage.removeItem("pref_plan");
  }, [preferredPlan]);

  if (!plans || plans.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <p className="text-xs text-text-muted">
          No subscription plans are available at the moment. Please check back later.
        </p>
      </div>
    );
  }

  const handleSubscribe = async (priceId: string) => {
    setLoading(priceId);
    const plan = plans.find((p) => p.priceId === priceId);
    capture(EVENTS.PLAN_SELECTED, { plan: plan?.planType ?? priceId });
    try {
      const result = await checkout({ priceId });
      capture(EVENTS.CHECKOUT_INITIATED, { plan: plan?.planType ?? priceId });
      if (result.url) window.location.href = result.url;
    } catch (e) {
      console.error("Checkout error:", e);
    } finally {
      setLoading(null);
    }
  };

  const planTypes = plans.map((p) => p.planType);
  const mappedPlan = preferredPlan === "ours" ? "standard" : preferredPlan;
  const recommended = mappedPlan && planTypes.includes(mappedPlan as typeof planTypes[number]) ? mappedPlan : "standard";

  // Determine which plans are grayed out based on apiKeySource
  const isGrayedOut = (planType: string) => {
    if (!filterByApiKeySource) return false;
    if (filterByApiKeySource === "byok") return planType !== "byok";
    return planType === "byok"; // filterByApiKeySource === "ours"
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-lg font-medium text-text mb-2 font-heading">
          Choose your plan to deploy
        </h2>
        <p className="text-xs text-text-muted max-w-md mx-auto">
          Subscribe to deploy and run your Claw Now instance.
          All plans include managed hosting and automatic updates.
        </p>
      </div>

      <div className={cn(
        "grid grid-cols-1 sm:grid-cols-2 gap-px bg-text/6",
        plans.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
      )}>
        {plans.map((plan) => {
          const grayed = isGrayedOut(plan.planType);
          const isPopular = plan.planType === "standard";
          const isRecommended = plan.planType === recommended;
          const highlighted = !grayed && (isRecommended || isPopular);
          const euros = (plan.priceEuroCents / 100).toFixed(0);
          const creditEuros = plan.includedCreditsCents > 0
            ? (plan.includedCreditsCents / 100).toFixed(0)
            : null;

          const handleClick = () => {
            if (grayed && onRequestChangeKeys) {
              // User wants a plan that doesn't match their apiKeySource — go back to change it
              const targetSource = plan.planType === "byok" ? "byok" : "ours";
              onRequestChangeKeys(targetSource);
              return;
            }
            handleSubscribe(plan.priceId);
          };

          return (
            <div
              key={plan.priceId}
              className={cn(
                "bg-surface flex flex-col p-6 relative transition-colors",
                highlighted && "bg-text/4",
                grayed && "opacity-40",
              )}
            >
              {highlighted && (
                <div className="absolute top-0 left-0 right-0 h-px bg-text/40" />
              )}

              <div className="flex items-center gap-2 mb-5">
                <h3 className="text-xs font-medium uppercase tracking-wider">
                  {plan.label}
                </h3>
                {plan.planType === "byok" && (
                  <span className="text-[9px] uppercase tracking-wider text-blue-600 dark:text-blue-400 border border-blue-600/30 dark:border-blue-400/30 px-1.5 py-0.5 leading-none font-medium">
                    7 Days Free
                  </span>
                )}
                {isPopular && !grayed && (
                  <span className="text-[9px] uppercase tracking-wider text-text/50 border border-text/20 px-1.5 py-0.5 leading-none">
                    Popular
                  </span>
                )}
                {isRecommended && !isPopular && !grayed && (
                  <span className="text-[9px] uppercase tracking-wider text-text/50 border border-text/20 px-1.5 py-0.5 leading-none">
                    Selected
                  </span>
                )}
              </div>

              <div className="mb-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight">{euros}</span>
                  <span className="text-xs text-text-muted">EUR/mo</span>
                </div>
              </div>

              <div className="border-t border-text/6 pt-4 mb-6 flex-1">
                <p className="text-[11px] text-text-muted leading-relaxed">
                  {creditEuros
                    ? `Includes EUR ${creditEuros} in model credits each month. Purchase extra credits anytime.`
                    : "Bring your own API keys — no markup on AI costs"}
                </p>
              </div>

              <Button
                className="w-full"
                variant={grayed ? "outline" : isRecommended ? "default" : "outline"}
                size="default"
                onClick={handleClick}
                disabled={loading !== null}
                loading={loading === plan.priceId}
              >
                {loading === plan.priceId
                  ? { byok: "Smart move!", basic: "Great choice!", standard: "Let's go!", premium: "Excellent taste!" }[plan.planType]
                  : grayed
                    ? plan.planType === "byok" ? "Switch to BYOK" : "Use Our Keys"
                    : plan.planType === "byok" ? "Start 7-Day Trial" : "Subscribe"}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[10px] text-text-muted/50 mt-4">
        All prices in EUR. Cancel anytime. Credits roll over month-to-month.
      </p>
    </div>
  );
}
