'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * /onboarding/welcome now just redirects:
 * - Unauthenticated users → /signup
 * - Authenticated users → /onboarding/plans
 *
 * The actual sign-up UI lives at /signup.
 */
export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    // The onboarding layout handles auth checks — if we reach here,
    // the user is either authenticated or in dev mode.
    // Redirect to plans to continue onboarding.
    const params = new URLSearchParams(window.location.search);
    const dev = params.has('dev') ? '?dev' : '';
    router.replace('/onboarding/plans' + dev);
  }, [router]);

  return null;
}
