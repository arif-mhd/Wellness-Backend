import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // supertokens-web-js ships as ESM; Next.js needs to transpile it
  transpilePackages: ["supertokens-web-js"],
  // Disable StrictMode to prevent double-mount tearing down LiveKit WebRTC connections
  reactStrictMode: false,
  // Cloudflare Workers doesn't run Next's built-in image optimization server —
  // serve images as-is instead of erroring on every <Image> at request time.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
