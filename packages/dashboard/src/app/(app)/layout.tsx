'use client';

import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { api } from "@/lib/convex-api";
import { Nav } from '@/components/nav';
import { MainContent } from '@/components/main-content';
import { DashboardConfigProvider } from '@/lib/dashboard-config';
import { GatewayProvider } from '@/lib/gateway';
import { ChatWidget } from '@/components/ai-agent/chat-widget';
import { OnboardingFlow } from '@/components/onboarding-flow';
import { LoadingScreen } from '@/components/loading-screen';

function RedirectToLogin() {
  const router = useRouter();
  useEffect(() => { router.replace('/login'); }, [router]);
  return null;
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const subscription = useQuery(api.stripe.getMySubscription);
  const deployment = useQuery(api.deploymentQueries.getMyDeployment);
  const searchParams = useSearchParams();

  if (subscription === undefined || deployment === undefined) return <LoadingScreen />;

  // No subscription at all — show full onboarding
  if (!subscription) return <OnboardingFlow />;

  // Post-checkout redirect — show setup step
  const isPostCheckout = searchParams.get('subscription') === 'success';

  // For deployment plans (not dashboard): show onboarding if no deployment exists yet
  const isDeploymentPlan = subscription.planType !== 'dashboard';
  const hasDeployment = deployment && deployment.status !== 'deactivated';

  if (isPostCheckout && isDeploymentPlan && !hasDeployment) {
    return <OnboardingFlow />;
  }

  // For Home plan post-checkout: show CLI setup if not done
  if (isPostCheckout && !isDeploymentPlan) {
    const setupDone = typeof window !== 'undefined' && localStorage.getItem('lifeos-setup-complete') === 'true';
    if (!setupDone) return <OnboardingFlow />;
  }

  // Normal app
  return (
    <GatewayProvider>
      <div className="flex w-full min-h-screen">
        <Nav />
        <MainContent>{children}</MainContent>
      </div>
      <ChatWidget />
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
