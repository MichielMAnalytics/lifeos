import { Nav } from '@/components/nav';
import { MainContent } from '@/components/main-content';

export const dynamic = 'force-dynamic';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full min-h-screen">
      <Nav />
      <MainContent>{children}</MainContent>
    </div>
  );
}
