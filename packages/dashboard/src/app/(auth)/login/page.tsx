'use client';

import { useAuthActions } from "@convex-dev/auth/react";

export default function LoginPage() {
  const { signIn } = useAuthActions();

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="border border-border p-12 text-center max-w-md">
        <h1 className="text-3xl font-bold text-text mb-2">LifeOS</h1>
        <p className="text-text-muted mb-8">Sign in to your life operating system</p>
        <button
          onClick={() => void signIn("google")}
          className="w-full bg-text text-bg px-6 py-3 text-sm font-medium uppercase tracking-wider hover:opacity-90 transition-opacity"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
