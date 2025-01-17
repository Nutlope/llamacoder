import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@codesandbox/sdk"],
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
