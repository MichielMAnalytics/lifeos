import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { ConvexClientProvider } from '@/lib/convex';
import './globals.css';

// All pages depend on Convex (auth, data) — skip static prerendering
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'LifeOS',
  description: 'Personal Life Operating System',
  icons: {
    icon: [
      { url: '/logo-only-black.svg', media: '(prefers-color-scheme: light)' },
      { url: '/logo-only-white.svg', media: '(prefers-color-scheme: dark)' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        {/* Phase 2 / Section 15 — themes (5 named + system). Section 15B — 7 fonts. */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700,900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Geist:wght@400;500;600;700;900&family=DM+Sans:wght@400;500;600;700;900&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Serif:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="overflow-x-hidden">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('lifeos-theme')||'system';var legacy={midnight:1,zen:1,nord:1,sunset:1,forest:1,light:1,dark:1};if(legacy[t]){t='system';localStorage.setItem('lifeos-theme','system')}if(t==='system'){t=window.matchMedia('(prefers-color-scheme:light)').matches?'github-light':'linear-dark'}document.documentElement.setAttribute('data-theme',t);var f=localStorage.getItem('lifeos-font');var legacyF={kefa:1,'space-grotesk':1,outfit:1,'source-serif':1,system:1};if(legacyF[f]){f='satoshi';localStorage.setItem('lifeos-font','satoshi')}if(f){var m={satoshi:'"Satoshi"',inter:'"Inter"',geist:'"Geist"','ibm-plex-serif':'"IBM Plex Serif", Georgia, serif','jetbrains-mono':'"JetBrains Mono", ui-monospace, monospace','dm-sans':'"DM Sans"',manrope:'"Manrope"'};if(m[f])document.documentElement.style.setProperty('--font-sans',m[f]+', ui-sans-serif, system-ui, sans-serif')}}catch(e){}`,
          }}
        />
        <ConvexClientProvider>
          <ThemeProvider>
            <div>{children}</div>
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
