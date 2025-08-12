import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@codesandbox/sdk", "@prisma/client"],
};

export default nextConfig;
