'use client';

import { useAuthActions } from "@convex-dev/auth/react";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui-clawnow/card";
import { capture, EVENTS } from "@/lib/analytics";

/**
 * Standalone sign-in card — no fixed positioning.
 * Used by LandingPage hero and as the inner content of <SignIn />.
 */
export function SignInCard() {
  const { signIn } = useAuthActions();

  return (
    <div className="w-full max-w-[360px]">
      {/* Top accent line */}
      <div className="h-[2px] bg-linear-to-r from-text/0 via-text/40 to-text/0" />

      <Card className="ring-text/8">
        <CardContent className="pt-10 pb-8 px-8">
          <div className="flex flex-col items-center text-center">
            {/* Logo mark */}
            <a href="https://lifeos.zone" className="mb-8 transition-transform duration-150 hover:scale-110 active:scale-95">
              <img
                src="/icon-white.svg"
                alt="LifeOS"
                className="size-9"
              />
            </a>

            {/* Title */}
            <h2 className="text-sm font-medium text-text tracking-tight mb-1 font-heading">
              Sign in to Life<span className="text-accent/70">OS</span>
            </h2>
            <p className="text-[11px] text-text-muted/70 mb-6">
              Welcome back. Please sign in to continue.
            </p>

            {/* Google button */}
            <button
              onClick={() => { capture(EVENTS.SIGNED_IN, { method: "google" }); void signIn("google"); }}
              className="w-full flex items-center justify-center gap-3 h-10 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium ring-1 ring-black/10 transition-all duration-150 hover:ring-black/20 active:scale-[0.99] cursor-pointer rounded-md"
            >
              <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-[10px] text-text-muted/70 tracking-wide uppercase">
          Secured by LifeOS
        </p>
      </div>
    </div>
  );
}

/**
 * Full-screen sign-in wrapper.
 * Handles auto-sign-in via ?plan= or ?model= URL params.
 * Falls back to rendering <SignInCard /> centered on the page.
 */
export function SignIn() {
  const { signIn } = useAuthActions();
  const [autoSigningIn, setAutoSigningIn] = useState(false);

  // Auto-trigger Google sign-in when arriving from marketing site with params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("plan") || params.has("model")) {
      setAutoSigningIn(true);
      capture(EVENTS.SIGNED_IN, { method: "google", auto: true });
      void signIn("google");
    }
  }, [signIn]);

  if (autoSigningIn) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg">
        <Loader2 className="size-6 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-bg">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative mx-4">
        <SignInCard />
      </div>
    </div>
  );
}
