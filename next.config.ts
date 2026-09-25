import type { NextConfig } from "next";

// Applied to every response. The CSP is deliberately limited to the directives that can't break the app
// (no script-src/style-src: Next.js inlines scripts and styles, and a strict policy needs per-request nonces).
// It still blocks the high-value attacks: clickjacking, <base> hijacking, form hijacking and plugin content.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework in every response.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
