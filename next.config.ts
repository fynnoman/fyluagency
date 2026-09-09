import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Neon Object Storage (S3-compatible)
      { protocol: "https", hostname: "*.neon.build" },
      { protocol: "https", hostname: "*.aws.neon.tech" },
      { protocol: "https", hostname: "*.neon.tech" },
    ],
  },
};

export default nextConfig;
