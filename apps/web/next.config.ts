import type { NextConfig } from "next";

import { env } from "./env";

const nextConfig: NextConfig = {
  // Agent guidance lives in the repo's CLAUDE.md and skills.
  agentRules: false,
  transpilePackages: ["@greenquote/domain", "@greenquote/db"],
  // One origin for web and API: the session cookie stays first-party, no CORS.
  rewrites: async () => [
    { source: "/api/:path*", destination: `${env.API_URL}/api/:path*` },
  ],
};

export default nextConfig;
