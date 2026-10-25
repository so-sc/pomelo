import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import path from "node:path";
import pkg from "../package.json";

// Dev reads the one repo-root .env shared with the server and daemon, replacing what Next
// already loaded from client/ (forceReload). The Docker image has no .env files; its
// variables come from the container environment.
loadEnvConfig(path.join(__dirname, ".."), process.env.NODE_ENV !== "production", { info: () => {}, error: console.error }, true);

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  /* config options here */
};

export default nextConfig;
