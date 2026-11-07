import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a production build sit next to a running dev server (e.g. NEXT_DIST_DIR=.next-prod).
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
