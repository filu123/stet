import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Devices on the local network (e.g. a tablet at http://192.168.x.x:3000)
   * reaching a `next dev -H 0.0.0.0` server. Dev-only; ignored in production.
   */
  allowedDevOrigins: ["192.168.0.*", "10.0.0.*", "*.local"],
  devIndicators: false
};

export default nextConfig;
