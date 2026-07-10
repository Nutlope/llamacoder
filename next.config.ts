import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],
  turbopack: {},
  async headers() {
    return [
      {
        source: "/preview-vendor/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type",
          },
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
      {
        source: "/preview-vendor-v2/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type",
          },
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/preview-vendor-v2/:path*",
        destination: "/preview-vendor/:path*",
      },
    ];
  },
  webpack: (config, options) => {
    if (options.nextRuntime === "edge") {
      if (!config.resolve.conditionNames) {
        config.resolve.conditionNames = ["require", "node"];
      }
      if (!config.resolve.conditionNames.includes("worker")) {
        config.resolve.conditionNames.push("worker");
      }
    }
    return config;
  },
};

export default nextConfig;
