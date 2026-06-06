import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    mcpServer: true,
  },
};

export default nextConfig;
