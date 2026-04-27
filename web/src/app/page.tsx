'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';

// Persist ?plan= param across OAuth/login redirect (read by onboarding route pages)
function StoreUrlPrefs() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');
  const billing = searchParams.get('billing');
  if (typeof window !== 'undefined') {
    if (plan) sessionStorage.setItem('pref_plan', plan);
    if (billing) sessionStorage.setItem('pref_billing', billing);
  }
  return null;
}

function GoToApp() {
  const router = useRouter();
  useEffect(() => { router.replace('/today'); }, [router]);
  return null;
}

function GoToLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(qs ? `/login?${qs}` : '/login');
  }, [router, searchParams]);
  return null;
}

export default function Home() {
  return (
    <div className="min-h-screen bg-bg">
      <StoreUrlPrefs />
      <AuthLoading>
        <div className="min-h-screen flex flex-col items-center justify-center">
          <img
            src="/logo-only-white.svg"
            alt="LifeAI"
            width={40}
            height={40}
            className="animate-pulse opacity-40"
          />
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
