import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // supertokens-web-js ships as ESM; Next.js needs to transpile it
  transpilePackages: ["supertokens-web-js"],
};

export default nextConfig;
