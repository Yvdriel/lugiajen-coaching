import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer ships its own React reconciler — keep it out of the
  // bundle so it runs as a plain Node dependency (avoids the bundled-reconciler
  // "ba.Component is not a constructor" crash). Ch11.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
