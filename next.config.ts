import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Dev only: lets the signed-out landing page load at 127.0.0.1 while a session cookie exists for localhost.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
