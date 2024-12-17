/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@codesandbox/sdk"],
  },
};

export default nextConfig;
