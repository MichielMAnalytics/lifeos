'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';

// Persist ?plan= param across OAuth/login redirect (read by onboarding-flow.tsx)
function StoreUrlPrefs() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');
  if (plan && typeof window !== 'undefined') {
    sessionStorage.setItem('pref_plan', plan);
  }
  return null;
}

function GoToApp() {
  const router = useRouter();
  useEffect(() => { router.replace('/life-coach'); }, [router]);
  return null;
}

function GoToLogin() {
  const router = useRouter();
  useEffect(() => { router.replace('/login'); }, [router]);
  return null;
}

export default function Home() {
  return (
    <div className="min-h-screen bg-bg">
      <StoreUrlPrefs />
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-text-muted text-sm tracking-wider uppercase animate-pulse">
            Signing in...
          </div>
        </div>
      </AuthLoading>
      <Authenticated>
        <GoToApp />
      </Authenticated>
      <Unauthenticated>
        <GoToLogin />
      </Unauthenticated>
    </div>
  );
}
