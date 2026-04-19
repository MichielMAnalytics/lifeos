'use client';

import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, Suspense } from "react";
import { api } from "@/lib/convex-api";
import { Nav } from '@/components/nav';
import { MainContent } from '@/components/main-content';
import { DashboardConfigProvider } from '@/lib/dashboard-config';
import { GatewayProvider } from '@/lib/gateway';
import { LoadingScreen } from '@/components/loading-screen';
import { GlobalUndo } from '@/components/global-undo';
import { LifeCoachOrb } from '@/components/life-coach-orb';
import { SetupHints } from '@/components/setup-hints';
import { TimeFormatProvider } from '@/components/time-format-provider';

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
  const pathname = usePathname();

  const isOnSetup = pathname.startsWith('/setup');
  const isPostCheckout = searchParams.get('subscription') === 'success';

  useEffect(() => {
    if (subscription === undefined || deployment === undefined) return;

    if (!subscription) {
      router.replace('/onboarding/welcome');
      return;
    }

    // Post-checkout redirect — go to setup chooser (but not if already there)
    if (isPostCheckout && !isOnSetup) {
      router.replace('/setup?subscription=success');
      return;
    }
  }, [subscription, deployment, searchParams, router, isPostCheckout, isOnSetup]);

  if (subscription === undefined || deployment === undefined) return <LoadingScreen />;
  if (!subscription) return <LoadingScreen />;

  // Post-checkout on a non-setup page — wait for redirect
  if (isPostCheckout && !isOnSetup) return <LoadingScreen />;

  // Setup pages render full-screen without nav
  if (isOnSetup) {
    return <>{children}</>;
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
      <SetupHints />
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
          <TimeFormatProvider>
            <AppShell>{children}</AppShell>
          </TimeFormatProvider>
        </DashboardConfigProvider>
      </Authenticated>
    </>
  );
}
