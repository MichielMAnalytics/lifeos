'use client';

import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { api } from "@/lib/convex-api";
import { Nav } from '@/components/nav';
import { MainContent } from '@/components/main-content';
import { DashboardConfigProvider } from '@/lib/dashboard-config';
import { GatewayProvider } from '@/lib/gateway';
import { LoadingScreen } from '@/components/loading-screen';
import { GlobalUndo } from '@/components/global-undo';
import { LifeCoachOrb } from '@/components/life-coach-orb';

function RedirectToLogin() {
  const router = useRouter();
  useEffect(() => { router.replace('/login'); }, [router]);
  return null;
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const subscription = useQuery(api.stripe.getMySubscription);
  const deployment = useQuery(api.deploymentQueries.getMyDeployment);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (subscription === undefined || deployment === undefined) return;

    // No subscription at all -- redirect to onboarding
    if (!subscription) {
      router.replace('/onboarding/welcome');
      return;
    }

    const isPostCheckout = searchParams.get('subscription') === 'success';
    const isDeploymentPlan = subscription.planType !== 'dashboard';
    const hasDeployment = deployment && deployment.status !== 'deactivated';

    // Post-checkout redirect for deployment plans without a deployment
    if (isPostCheckout && isDeploymentPlan && !hasDeployment) {
      router.replace('/onboarding/setup?subscription=success');
      return;
    }

    // Post-checkout redirect for Home plan
    if (isPostCheckout && !isDeploymentPlan) {
      const setupDone = typeof window !== 'undefined' && localStorage.getItem('lifeos-setup-complete') === 'true';
      if (!setupDone) {
        router.replace('/onboarding/setup?subscription=success');
        return;
      }
    }
  }, [subscription, deployment, searchParams, router]);

  if (subscription === undefined || deployment === undefined) return <LoadingScreen />;

  // While redirecting, show loading screen
  if (!subscription) return <LoadingScreen />;

  const isPostCheckout = searchParams.get('subscription') === 'success';
  const isDeploymentPlan = subscription.planType !== 'dashboard';
  const hasDeployment = deployment && deployment.status !== 'deactivated';

  if (isPostCheckout && isDeploymentPlan && !hasDeployment) return <LoadingScreen />;
  if (isPostCheckout && !isDeploymentPlan) {
    const setupDone = typeof window !== 'undefined' && localStorage.getItem('lifeos-setup-complete') === 'true';
    if (!setupDone) return <LoadingScreen />;
  }

  // Normal app
  return (
    <GatewayProvider>
      <GlobalUndo />
      <div className="flex w-full min-h-screen">
        <Nav />
        <MainContent>{children}</MainContent>
      </div>
      <LifeCoachOrb />
    </GatewayProvider>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AppShellInner>{children}</AppShellInner>
    </Suspense>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>

      <Unauthenticated>
        <RedirectToLogin />
      </Unauthenticated>

      <Authenticated>
        <DashboardConfigProvider>
          <AppShell>{children}</AppShell>
        </DashboardConfigProvider>
      </Authenticated>
    </>
  );
}
