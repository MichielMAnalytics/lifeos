'use client';

import {
  Authenticated,
  Unauthenticated,
  useQuery,
  useAction,
  useMutation,
} from "convex/react";
import { api } from "@/lib/convex-api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { capture, reset, EVENTS } from "@/lib/analytics";
import { useHints } from "@/components/ai-agent/hint-dots";

function UserMenu() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.currentUser.get);
  const subscription = useQuery(api.stripe.getMySubscription);
  const balance = useQuery(api.stripe.getBalance);
  const billingPortal = useAction(api.stripe.createBillingPortalSession);
  const checkout = useAction(api.stripe.createCreditCheckout);
  const tiers = useQuery(api.stripe.getCreditTiersList);
  const redeemCoupon = useMutation(api.coupons.redeemCoupon);
  const [open, setOpen] = useState(false);
  const [creditLoading, setCreditLoading] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!user) return null;

  const initial = (user.name?.[0] ?? user.email?.[0] ?? "U").toUpperCase();

  const planLabels: Record<string, string> = {
    byok: "BYOK",
    basic: "Basic",
    standard: "Standard",
    premium: "Premium",
  };

  const handleManageBilling = async () => {
    capture(EVENTS.BILLING_PORTAL_OPENED);
    try {
      const { url } = await billingPortal({});
      window.location.href = url;
    } catch (e) {
      console.error(e);
    }
  };

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponResult(null);
    try {
      const result = await redeemCoupon({ code: couponCode });
      if (result.success) {
        setCouponCode("");
        setCouponResult({
          success: true,
          message: `+EUR ${((result.creditedCents ?? 0) / 100).toFixed(2)} credited!`,
        });
        capture(EVENTS.COUPON_REDEEMED, { creditedCents: result.creditedCents });
      } else {
        setCouponResult({ success: false, message: result.error ?? "Redemption failed" });
      }
    } catch {
      setCouponResult({ success: false, message: "Something went wrong" });
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePurchase = async (priceId: string) => {
    setCreditLoading(priceId);
    const tier = tiers?.find((t) => t.priceId === priceId);
    capture(EVENTS.CREDIT_PURCHASED, { tier: tier?.label ?? priceId });
    try {
      const result = await checkout({ priceId });
      if (result.url) window.location.href = result.url;
    } catch (e) {
      console.error(e);
    } finally {
      setCreditLoading(null);
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      {subscription && (
        <span className="text-[10px] text-text-muted hidden sm:inline">
          {planLabels[subscription.planType]}
          {subscription.planType !== "byok" && balance !== undefined &&
            ` · EUR ${((balance ?? 0) / 100).toFixed(2)}`}
        </span>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-1 py-1 hover:bg-surface-hover transition-colors cursor-pointer rounded-md"
      >
        {user.image ? (
          <img
            src={user.image}
            alt=""
            className="size-7 rounded-md"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="size-7 rounded-md bg-accent flex items-center justify-center text-xs font-medium text-bg">
            {initial}
          </div>
        )}
        <span className="text-xs text-text-muted hidden sm:inline">
          {user.name ?? user.email}
        </span>
        <ChevronDown className="size-3 text-text-muted hidden sm:block" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-64 bg-surface ring-1 ring-text/10 z-50 rounded-lg">
            {/* User info */}
            <div className="px-3 py-2 border-b border-text/5">
              <p className="text-xs text-text font-medium truncate">
                {user.name}
              </p>
              <p className="text-[10px] text-text-muted truncate">
                {user.email}
              </p>
            </div>

            {/* Subscription */}
            {subscription && (
              <div className="px-3 py-2.5 border-b border-text/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-text-muted">
                    Plan
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {subscription.cancelAtPeriodEnd ? "Cancels" : "Renews"}{" "}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-text font-medium">
                  {planLabels[subscription.planType]}
                  {subscription.priceEuroCents > 0 &&
                    ` · EUR ${(subscription.priceEuroCents / 100).toFixed(0)}/mo`}
                </p>
                <div className="mt-2">
                  <button
                    onClick={handleManageBilling}
                    className="text-[10px] text-text-muted hover:text-text transition-colors cursor-pointer"
                  >
                    Manage Billing
                  </button>
                  <p className="text-[10px] text-text-muted mt-1">
                    Want to switch tiers?{" "}
                    <a
                      href="mailto:support@lifeos.zone?subject=%5BLifeOS%5D%20Support%20request&body=Hi!%20I%20need%20help%20with%3A%0A%0A"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="underline hover:text-text transition-colors"
                    >
                      Contact support
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* Credits */}
            {subscription && subscription.planType !== "byok" && (
              <div className="px-3 py-2.5 border-b border-text/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-text-muted">
                    Credits
                  </span>
                  <span className="text-xs font-medium">
                    EUR {((balance ?? 0) / 100).toFixed(2)}
                  </span>
                </div>
                {tiers && tiers.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tiers.map((tier) => (
                      <button
                        key={tier.priceId}
                        onClick={() => handlePurchase(tier.priceId)}
                        disabled={creditLoading !== null}
                        className="text-[10px] px-2 py-0.5 ring-1 ring-text/10 text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-50 rounded"
                      >
                        {creditLoading === tier.priceId ? "..." : `+${tier.label}`}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-1 mt-2">
                  <input
                    type="text"
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value); setCouponResult(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRedeemCoupon(); }}
                    className="flex-1 min-w-0 text-[10px] px-2 py-0.5 bg-transparent ring-1 ring-text/10 text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-text/30 rounded"
                  />
                  <button
                    onClick={handleRedeemCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="text-[10px] px-2 py-0.5 ring-1 ring-text/10 text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-50 rounded"
                  >
                    {couponLoading ? "..." : "Redeem"}
                  </button>
                </div>
                {couponResult && (
                  <p className={cn("text-[10px]", couponResult.success ? "text-green-500" : "text-red-400")}>
                    {couponResult.message}
                  </p>
                )}
              </div>
            )}

            {/* Sign out */}
            <button
              onClick={() => { capture(EVENTS.SIGNED_OUT); reset(); void signOut(); }}
              className="w-full text-left px-3 py-2 text-xs text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer flex items-center gap-2"
            >
              <LogOut className="size-3" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function HintsToggle() {
  const { dismissed, dismiss, restore } = useHints();

  return (
    <button
      onClick={dismissed ? restore : dismiss}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer",
        dismissed
          ? "text-text-muted/25 hover:text-text-muted/50"
          : "text-text-muted/50 hover:text-text-muted",
      )}
    >
      <span className="relative flex size-[5px]">
        {!dismissed && <span className="absolute inset-[-3px] rounded-full bg-accent/15 animate-pulse" />}
        <span className="relative size-[5px] rounded-full bg-accent/60" />
      </span>
      <span className="text-[10px] hidden sm:inline">
        {dismissed ? "Show tips" : "Hide tips"}
      </span>
    </button>
  );
}

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <a href="https://lifeos.zone" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold tracking-tight text-text hover:opacity-80 transition-opacity">
          Life<span className="text-accent">OS</span>
        </a>
      </div>
      <Authenticated>
        <HintsToggle />
      </Authenticated>
      <div className="flex items-center gap-3">
        <Authenticated>
          <UserMenu />
        </Authenticated>
        <Unauthenticated>
          <a href="mailto:support@lifeos.zone?subject=%5BLifeOS%5D%20Support%20request&body=Hi!%20I%20need%20help%20with%3A%0A%0A" className="text-text-muted text-xs hover:text-text transition-colors">
            Contact Support
          </a>
        </Unauthenticated>
      </div>
    </header>
  );
}
