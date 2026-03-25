import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../'),
  transpilePackages: ['@lifeos/shared'],
  typescript: {
    // Type checking done in CI via `tsc --noEmit`, not during build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
