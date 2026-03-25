'use client';

import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/convex-api";
import { Nav } from '@/components/nav';
import { MainContent } from '@/components/main-content';
import { DashboardConfigProvider } from '@/lib/dashboard-config';
import { GatewayProvider } from '@/lib/gateway';
import { ChatWidget } from '@/components/ai-agent/chat-widget';
import { OnboardingFlow } from '@/components/onboarding-flow';

function RedirectToLogin() {
  const router = useRouter();
  useEffect(() => { router.replace('/login'); }, [router]);
  return null;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const subscription = useQuery(api.stripe.getMySubscription);

  // Still loading
  if (subscription === undefined) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-text-muted text-sm tracking-wider uppercase animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  // No subscription — show onboarding (full screen, no sidebar)
  if (!subscription) {
    return <OnboardingFlow />;
  }

  // Has subscription — show normal app with sidebar
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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen bg-bg flex items-center justify-center">
          <div className="text-text-muted text-sm tracking-wider uppercase animate-pulse">
            Loading...
          </div>
        </div>
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
