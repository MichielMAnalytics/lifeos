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

const SETUP_DONE_KEY = 'lifeos-setup-complete';

function RedirectToLogin() {
  const router = useRouter();
  useEffect(() => { router.replace('/login'); }, [router]);
  return null;
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const subscription = useQuery(api.stripe.getMySubscription);
  const searchParams = useSearchParams();
  const [setupDone, setSetupDone] = useState<boolean | null>(null);

  useEffect(() => {
    const done = localStorage.getItem(SETUP_DONE_KEY) === 'true';
    setSetupDone(done);
  }, []);

  // Mark setup as done when OnboardingFlow completes (user enters the app)
  useEffect(() => {
    if (setupDone === false && subscription && !searchParams.get('subscription')) {
      // User has subscription and no ?subscription= param — they navigated here normally
      localStorage.setItem(SETUP_DONE_KEY, 'true');
      setSetupDone(true);
    }
  }, [subscription, searchParams, setupDone]);

  if (subscription === undefined || setupDone === null) return <LoadingScreen />;

  // No subscription — show full onboarding (plan selection)
  if (!subscription) return <OnboardingFlow />;

  // Fresh from Stripe checkout — show setup step
  const isPostCheckout = searchParams.get('subscription') === 'success';
  if (isPostCheckout && !setupDone) {
    return <OnboardingFlow />;
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
