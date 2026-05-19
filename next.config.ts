import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['fabric'],
  turbopack: {},
};

export default nextConfig;
