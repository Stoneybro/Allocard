import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile the actual Web3Auth/MetaMask ESM packages Next needs to bundle.
  transpilePackages: [
    "@web3auth/modal",
    "@web3auth/no-modal",
    "@web3auth/auth",
    "@web3auth/ws-embed",
    "@toruslabs/base-controllers",
    "@toruslabs/http-helpers",
  ],

  // Turbopack is the default bundler in Next.js 16+.
  // An empty `turbopack` object silences the "no turbopack config" warning
  // while preserving Turbopack's default optimisations.
  // Node.js built-in fallbacks (fs, net, etc.) are handled automatically
  // by Turbopack for browser bundles, so no manual overrides are needed here.
  turbopack: {},
};

export default nextConfig;
