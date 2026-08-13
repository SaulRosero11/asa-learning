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
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
    return [
      // Solo proxea rutas del backend — /api/v1/ para no colisionar con API routes de Next.js
      { source: "/api/v1/:path*", destination: `${backendUrl}/api/v1/:path*` },
      { source: "/oauth2/:path*", destination: `${backendUrl}/oauth2/:path*` },
      { source: "/login/oauth2/:path*", destination: `${backendUrl}/login/oauth2/:path*` },
      { source: "/actuator/health", destination: `${backendUrl}/actuator/health` },
    ];
  },
};

export default nextConfig;
