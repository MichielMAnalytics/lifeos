'use client';

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Nav } from '@/components/nav';
import { MainContent } from '@/components/main-content';
import { DashboardConfigProvider } from '@/lib/dashboard-config';
import { GatewayProvider } from '@/lib/gateway';
import { ChatWidget } from '@/components/ai-agent/chat-widget';

function RedirectToLogin() {
  const router = useRouter();
  useEffect(() => { router.replace('/login'); }, [router]);
  return null;
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
          <GatewayProvider>
            <div className="flex w-full min-h-screen">
              <Nav />
              <MainContent>{children}</MainContent>
            </div>
            <ChatWidget />
          </GatewayProvider>
        </DashboardConfigProvider>
      </Authenticated>
    </>
  );
}
