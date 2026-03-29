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
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('lifeos-theme')||'system';if(t==='system'){t=window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dark'}document.documentElement.setAttribute('data-theme',t);var f=localStorage.getItem('lifeos-font');if(f){var m={kefa:'"Kefa"',satoshi:'"Satoshi"',inter:'"Inter"','jetbrains':'"JetBrains Mono", ui-monospace, monospace','space-grotesk':'"Space Grotesk"','dm-sans':'"DM Sans"',outfit:'"Outfit"',geist:'"Geist"','ibm-plex':'"IBM Plex Sans"','source-serif':'"Source Serif 4", Georgia, serif',system:'ui-sans-serif, system-ui, -apple-system, sans-serif'};if(m[f])document.documentElement.style.setProperty('--font-sans',m[f]+', ui-sans-serif, system-ui, sans-serif')}}catch(e){}`,
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
