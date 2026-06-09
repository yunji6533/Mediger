import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.111.137.194"],
  async rewrites() {
    if (!API_URL) return [];
    return [
      {
        source: "/api-proxy/:path*",
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;