// Hardhat is used for COMPILATION (and optional tests). Deployment goes through
// viem in scripts/deploy.ts (run with tsx) to avoid ts-node/tsconfig friction
// with the Next.js 16 setup. Config mirrors 0G's agenticID-examples.
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.27",
    settings: {
      evmVersion: "cancun",
      optimizer: { enabled: true, runs: 200 },
    },
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
    cache: "./cache",
  },
  networks: {
    zgGalileo: {
      url: process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai",
      chainId: 16602,
      accounts: (process.env.RELAYER_KEYS || "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    },
  },
};
