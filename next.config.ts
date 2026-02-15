import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: '/api/ai/:path*',
        destination: 'http://127.0.0.1:5328/api/ai/:path*',
      },
    ];
  },
  devIndicators: false,
};

export default nextConfig;
