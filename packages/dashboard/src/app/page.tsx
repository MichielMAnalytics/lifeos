'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';

function GoToApp() {
  const router = useRouter();
  useEffect(() => { router.replace('/today'); }, [router]);
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
