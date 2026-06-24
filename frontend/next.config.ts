import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Allow the preview URL host through dev-time origin checks (Next 16 strict by default)
  allowedDevOrigins: ["*", "*.preview.emergentagent.com", "hr-system-build-3.preview.emergentagent.com"],
  // Disable telemetry & turbopack quirks for stability
  experimental: {},
};

export default nextConfig;
