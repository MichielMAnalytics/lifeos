import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    // Type checking done in CI via `tsc --noEmit`, not during build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
