import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Next's developer "N" button away from the nav tabs.
  devIndicators: {
    position: "top-left",
  },
};

export default nextConfig;
