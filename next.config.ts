import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  ...(process.env.NEXUS_CLOUDFLARE_BUILD === "1"
    ? {
        turbopack: {
          resolveAlias: {
            "@/db/client": "./src/db/client-cloudflare.ts",
            "@/lib/password": "./src/lib/password-cloudflare.ts",
          },
        },
      }
    : {}),
  poweredByHeader: false,
  devIndicators: false,
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
