import type { NextConfig } from "next";
import { cpSync, existsSync, mkdirSync } from "fs";

// Copy Cesium assets to public folder
const cesiumSource = "node_modules/cesium/Build/Cesium";
const cesiumDest = "public/cesium";

if (!existsSync(cesiumDest)) {
  mkdirSync(cesiumDest, { recursive: true });
  cpSync(cesiumSource, cesiumDest, { recursive: true });
  console.log("✓ Copied Cesium assets to public/cesium");
}

const nextConfig: NextConfig = {
  devIndicators: false,
  webpack: (config, { isServer }) => {
    // Cesium configuration for Next.js
    config.module = config.module || {};
    config.module.noParse = config.module.noParse || [];
    config.module.noParse.push(/cesium\/Source/);

    // Handle Cesium's require statements
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
};

export default nextConfig;
