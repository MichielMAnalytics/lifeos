'use client';

import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { LoadingScreen } from '@/components/loading-screen';
import { AuthScreen } from '@/components/auth-screen';

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

function RedirectToOnboarding() {
  const router = useRouter();
  useEffect(() => { router.replace('/onboarding/plans'); }, [router]);
  return null;
}

function SignupInner() {
  return (
    <>
      <StoreUrlPrefs />
      <Authenticated>
        <RedirectToOnboarding />
      </Authenticated>
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>
      <Unauthenticated>
        <AuthScreen mode="signup" />
      </Unauthenticated>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SignupInner />
    </Suspense>
  );
}
