import type { NextConfig } from "next";

/**
 * If you see "RangeError: Max payload size exceeded" / WS_ERR_UNSUPPORTED_MESSAGE_LENGTH
 * in dev, the HMR WebSocket is hitting Node's message size limit (often with very large
 * files or heavy IDE tooling). Use: npm run dev:webpack
 */
const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
