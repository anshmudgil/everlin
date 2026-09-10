import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer must run as a real Node package on the server, not be
  // bundled — bundling breaks its font/stream internals. This is what makes the
  // PDF render path work in the App Router runtime (see T04 harness note).
  serverExternalPackages: ["@react-pdf/renderer", "pdf-parse"],
};

export default nextConfig;
