import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "solidaridadyaccion.org",
      },
    ],
  },
};

export default nextConfig;
