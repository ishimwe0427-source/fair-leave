import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

// Absolute project root — do NOT use process.cwd(); parent lockfiles / wrong cwd
// make Turbopack resolve outside this app and 404 every real route.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
