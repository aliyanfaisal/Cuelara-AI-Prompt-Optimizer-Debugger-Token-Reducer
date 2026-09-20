import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle (server.js + only the node_modules it needs) — deployed as-is over SSH.
  output: "standalone",
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  // pdf.js loads its worker file dynamically, which file tracing can't see — without this
  // the standalone bundle builds fine but every PDF upload fails at runtime.
  outputFileTracingIncludes: {
    "/api/tools/context-extractor": ["./node_modules/pdf-parse/**/*", "./node_modules/pdfjs-dist/**/*"],
  },
};

export default nextConfig;
