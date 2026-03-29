import type { NextConfig } from "next";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000/api";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND}/:path*`,
      },
    ];
  },
};

export default nextConfig;
