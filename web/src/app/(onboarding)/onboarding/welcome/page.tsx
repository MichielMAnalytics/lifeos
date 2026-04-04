'use client';

import { useAuthActions } from '@convex-dev/auth/react';
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { SoftGlow } from '@/components/onboarding/soft-glow';
import { LoadingScreen } from '@/components/loading-screen';
import { onboardingPath } from '@/lib/onboarding-store';

const isDev = process.env.NODE_ENV === 'development';

function RedirectToPlans() {
  const router = useRouter();
  useEffect(() => { router.replace(onboardingPath('/onboarding/plans')); }, [router]);
  return null;
}

function WelcomeContent() {
  const { signIn } = useAuthActions();

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <SoftGlow />

      <div className="flex flex-col items-center text-center w-full max-w-sm px-6">
        {/* Logo */}
        <div className="mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 140"
            width="36"
            height="50"
            className="opacity-40"
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

        {/* Value prop */}
        <h1 className="text-3xl font-light tracking-tight text-text leading-snug">
          Your personal
          <br />
          <span className="font-semibold">Life Operating System</span>
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-text-muted/60 max-w-xs">
          Goals. Plans. Journals. Reviews.
          <br />
          All in one calm, focused space — with an AI LifeCoach to keep you on track.
        </p>

        {/* Divider */}
        <div className="mt-10 w-full flex items-center gap-4">
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-[11px] text-text-muted/30 uppercase tracking-wider">Get started</span>
          <div className="flex-1 h-px bg-border/40" />
        </div>

        {/* Google sign in */}
        <button
          onClick={() => void signIn('google')}
          className="mt-6 w-full flex items-center justify-center gap-3 rounded-xl border border-border/60 bg-surface/30 px-6 py-3.5 text-sm font-medium text-text transition-all duration-200 hover:bg-surface/60 hover:border-text-muted/30 active:scale-[0.98]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        <p className="mt-4 text-[11px] text-text-muted/30 leading-relaxed">
          Already have an account?{' '}
          <a href="/login" className="text-text-muted/50 underline underline-offset-2 hover:text-text-muted">
            Log in
          </a>
        </p>

        <p className="mt-6 text-[10px] text-text-muted/20">
          By continuing, you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}

function DevWelcomeContent() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <SoftGlow />
      <div className="fixed top-6 right-6 z-50 text-[11px] text-warning/60 font-mono">dev mode</div>

      <div className="flex flex-col items-center text-center w-full max-w-sm px-6">
        <div className="mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" width="36" height="50" className="opacity-40">
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

        <h1 className="text-3xl font-light tracking-tight text-text leading-snug">
          Your personal
          <br />
          <span className="font-semibold">Life Operating System</span>
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-text-muted/60 max-w-xs">
          Goals. Plans. Journals. Reviews.
          <br />
          All in one calm, focused space — with an AI LifeCoach to keep you on track.
        </p>

        <div className="mt-10 w-full flex items-center gap-4">
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-[11px] text-text-muted/30 uppercase tracking-wider">Get started</span>
          <div className="flex-1 h-px bg-border/40" />
        </div>

        <button
          onClick={() => router.push('/onboarding/plans?dev')}
          className="mt-6 w-full flex items-center justify-center gap-3 rounded-xl border border-border/60 bg-surface/30 px-6 py-3.5 text-sm font-medium text-text transition-all duration-200 hover:bg-surface/60 hover:border-text-muted/30 active:scale-[0.98]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google (dev)
        </button>

        <p className="mt-6 text-[10px] text-text-muted/20">
          By continuing, you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}

function WelcomeRouter() {
  const searchParams = useSearchParams();
  const isDevMode = isDev && searchParams.get('dev') !== null;

  if (isDevMode) return <DevWelcomeContent />;

  return (
    <>
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>
      <Authenticated>
        <RedirectToPlans />
      </Authenticated>
      <Unauthenticated>
        <WelcomeContent />
      </Unauthenticated>
    </>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <WelcomeRouter />
    </Suspense>
  );
}
