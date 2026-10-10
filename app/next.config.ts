import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@drugrep/sdk", "@drugrep/engine-bridge"],
  outputFileTracingRoot: root,
  turbopack: { root },
  reactStrictMode: true,
};

export default config;
