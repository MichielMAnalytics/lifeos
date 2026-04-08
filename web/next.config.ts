import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  typescript: {
    // Type checking done in CI via `tsc --noEmit`, not during build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
