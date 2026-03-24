'use client';

import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function RedirectToApp() {
  const router = useRouter();
  useEffect(() => { router.replace('/today'); }, [router]);
  return null;
}

export default function LoginPage() {
  const { signIn } = useAuthActions();

  return (
    <>
      {/* If already authenticated, go to the app */}
      <Authenticated>
        <RedirectToApp />
      </Authenticated>

      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center bg-bg">
          <div className="text-text-muted text-sm tracking-wider uppercase animate-pulse">
            Loading...
          </div>
        </div>
      </AuthLoading>

      {/* Show login form only when unauthenticated */}
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="border border-border p-12 text-center max-w-md">
          <h1 className="text-3xl font-bold text-text mb-2">LifeOS</h1>
          <p className="text-text-muted mb-8">Sign in to your life operating system</p>
          <button
            onClick={() => void signIn("google")}
            className="w-full bg-text text-bg px-6 py-3 text-sm font-medium uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-3"
          >
            <img src="/google-icon.png" alt="" width={20} height={20} />
            Continue with Google
          </button>
        </div>
      </div>
    </>
  );
}
