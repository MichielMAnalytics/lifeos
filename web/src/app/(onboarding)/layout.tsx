'use client';

import { Authenticated, Unauthenticated, AuthLoading, useQuery } from 'convex/react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@/lib/convex-api';
import { SoftGlow } from '@/components/onboarding/soft-glow';
import { LoadingScreen } from '@/components/loading-screen';

const isDev = process.env.NODE_ENV === 'development';

function RedirectToSignup() {
  const router = useRouter();
  useEffect(() => { router.replace('/signup'); }, [router]);
  return null;
}

function OnboardingShellInner({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuthActions();
  const subscription = useQuery(api.stripe.getMySubscription);
  const deployment = useQuery(api.deploymentQueries.getMyDeployment);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (subscription === undefined || deployment === undefined) return;

    // ?dev bypass: skip redirect so developers can view onboarding pages when already onboarded
    if (searchParams.get('dev') !== null) return;

    const isPostCheckout = searchParams.get('subscription') === 'success';
    const hasSubscription = !!subscription;
    const isDeploymentPlan = subscription?.planType !== 'dashboard';
    const hasDeployment = deployment && deployment.status !== 'deactivated';

    if (hasSubscription && hasDeployment && !isPostCheckout) {
      router.replace('/life-coach');
      return;
    }

    if (hasSubscription && !isDeploymentPlan && !isPostCheckout) {
      const setupDone = typeof window !== 'undefined' && localStorage.getItem('lifeos-setup-complete') === 'true';
      if (setupDone) {
        router.replace('/today');
        return;
      }
    }
  }, [subscription, deployment, searchParams, router]);

  if (subscription === undefined || deployment === undefined) return <LoadingScreen />;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bg">
      <SoftGlow />
      <button
        onClick={() => void signOut()}
        className="fixed top-6 right-6 z-50 text-[11px] text-text-muted/30 hover:text-text-muted/60 transition-colors"
      >
        Sign out
      </button>
      {children}
    </div>
  );
}

function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <OnboardingShellInner>{children}</OnboardingShellInner>
    </Suspense>
  );
}

/** Dev-only shell: no auth, no subscription checks */
function DevShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bg">
      <SoftGlow />
      <div className="fixed top-6 right-6 z-50 text-[11px] text-warning/60 font-mono">dev mode</div>
      {children}
    </div>
  );
}

function LayoutRouter({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isDevMode = isDev && searchParams.get('dev') !== null;
  const isWelcomePage = pathname === '/onboarding/welcome';

  // Dev mode: bypass everything
  if (isDevMode) {
    return <DevShell>{children}</DevShell>;
  }

  // Welcome page handles its own auth (sign-up / sign-in page)
  if (isWelcomePage) {
    return <>{children}</>;
  }

  // All other onboarding pages require auth
  return (
    <>
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>
      <Unauthenticated>
        <RedirectToSignup />
      </Unauthenticated>
      <Authenticated>
        <OnboardingShell>{children}</OnboardingShell>
      </Authenticated>
    </>
  );
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LayoutRouter>{children}</LayoutRouter>
    </Suspense>
  );
}
