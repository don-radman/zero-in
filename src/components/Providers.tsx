"use client";
// Privy wraps the app when NEXT_PUBLIC_PRIVY_APP_ID is set. Without it (local
// dev before keys), children render bare and the app falls back to dev email
// auth (DEV_FAKE_AUTH on the server).
import { PrivyProvider } from "@privy-io/react-auth";

const ZG_GALILEO = {
  id: 16602,
  name: "0G-Galileo-Testnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } },
  blockExplorers: { default: { name: "0G Explorer", url: "https://chainscan-galileo.0g.ai" } },
};

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) return <>{children}</>;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email"],
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        defaultChain: ZG_GALILEO as any,
        supportedChains: [ZG_GALILEO as any],
        appearance: {
          theme: "dark",
          accentColor: "#7C5CFF",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
