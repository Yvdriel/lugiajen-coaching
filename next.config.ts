import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer ships its own React reconciler — keep it out of the
  // bundle so it runs as a plain Node dependency (avoids the bundled-reconciler
  // "ba.Component is not a constructor" crash). Ch11. React Email's renderer is
  // kept external for the same reason (it renders email components server-side).
  serverExternalPackages: [
    "@react-pdf/renderer",
    "@react-email/components",
    "@react-email/render",
  ],

  // Baseline security headers on every response (Ch12 hardening). A strict CSP
  // needs nonce wiring and is left as a documented follow-up; the portal `proxy`
  // additionally sets a stricter `Referrer-Policy: no-referrer` for token URLs.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
