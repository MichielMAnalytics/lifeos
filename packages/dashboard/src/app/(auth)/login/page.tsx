'use client';

import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingScreen } from "@/components/loading-screen";

function RedirectToApp() {
  const router = useRouter();
  useEffect(() => { router.replace('/today'); }, [router]);
  return null;
}

export default function LoginPage() {
  const { signIn } = useAuthActions();

  return (
    <>
      <Authenticated>
        <RedirectToApp />
      </Authenticated>

      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>

      <div className="min-h-screen flex items-center justify-center bg-bg">
        {/* Soft ambient glow */}
        <div
          className="pointer-events-none fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.02]"
          style={{ background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)' }}
        />

        <div className="flex flex-col items-center text-center w-full max-w-sm px-6">
          {/* Logo */}
          <div className="mb-8 animate-[breathe_6s_ease-in-out_infinite]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 100 140"
              width="40"
              height="56"
              className="opacity-50"
            >
              <rect x="22" y="20" width="56" height="70" fill="none" stroke="var(--color-text)" strokeWidth="4.5" strokeLinejoin="miter" />
              <line x1="50" y1="115" x2="50" y2="25" stroke="var(--color-text)" strokeWidth="4.5" strokeLinecap="round" />
              <line x1="50" y1="85" x2="26" y2="65" stroke="var(--color-text)" strokeWidth="4" strokeLinecap="round" />
              <line x1="50" y1="85" x2="74" y2="65" stroke="var(--color-text)" strokeWidth="4" strokeLinecap="round" />
              <line x1="50" y1="62" x2="30" y2="42" stroke="var(--color-text)" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="50" y1="62" x2="70" y2="42" stroke="var(--color-text)" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="50" y1="45" x2="38" y2="28" stroke="var(--color-text)" strokeWidth="3" strokeLinecap="round" />
              <line x1="50" y1="45" x2="62" y2="28" stroke="var(--color-text)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-light tracking-tight text-text">
            Life<span className="font-semibold">OS</span>
          </h1>
          <p className="mt-2 text-sm text-text-muted/60">
            Your personal life operating system
          </p>

          {/* Google sign in */}
          <button
            onClick={() => void signIn("google")}
            className="mt-10 w-full flex items-center justify-center gap-3 rounded-xl bg-text text-bg px-6 py-3.5 text-sm font-medium transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          >
            <img src="/google-icon.png" alt="" width={18} height={18} />
            Continue with Google
          </button>

          <p className="mt-6 text-[11px] text-text-muted/30">
            By continuing, you agree to our terms of service.
          </p>
        </div>

        <style jsx>{`
          @keyframes breathe {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.04); opacity: 0.65; }
          }
        `}</style>
      </div>
    </>
  );
}
