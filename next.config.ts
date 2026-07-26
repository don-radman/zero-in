import type { NextConfig } from "next";

// One canonical host. Privy sessions live in browser storage PER hostname, so
// anyone bouncing between www / vercel.app aliases and the apex looked signed
// out. Every alias now 308s to zeroin.space.
const ALIAS_HOSTS = [
  "www.zeroin.space",
  "zero-in-three.vercel.app",
  "zero-in-lion-rises-projects.vercel.app",
  "zero-in-lion-rise-lion-rises-projects.vercel.app",
];

const nextConfig: NextConfig = {
  // 0G storage SDK + ethers stay external (native/node internals; loaded lazily)
  serverExternalPackages: ["@0gfoundation/0g-storage-ts-sdk", "ethers"],
  async redirects() {
    return ALIAS_HOSTS.map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: "https://zeroin.space/:path*",
      permanent: true,
    }));
  },
};

export default nextConfig;
