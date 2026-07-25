// Privy server-side auth: verify the client's access token, resolve email +
// embedded wallet address. DEV_FAKE_AUTH=1 bypasses Privy for local flow tests
// before keys exist (NEVER set in production).
import { PrivyClient } from "@privy-io/server-auth";

export type AuthedUser = {
  privyId: string;
  email: string;
  wallet: `0x${string}` | null;
};

let cached: PrivyClient | null = null;

function privy(): PrivyClient {
  if (cached) return cached;
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const secret = process.env.PRIVY_APP_SECRET;
  if (!appId || !secret) throw new Error("NEXT_PUBLIC_PRIVY_APP_ID / PRIVY_APP_SECRET not set");
  cached = new PrivyClient(appId, secret);
  return cached;
}

export async function verifyAuth(req: Request): Promise<AuthedUser> {
  if (process.env.DEV_FAKE_AUTH === "1") {
    const email = req.headers.get("x-dev-email");
    if (!email) throw new Error("DEV_FAKE_AUTH: send x-dev-email header");
    return {
      privyId: `dev:${email}`,
      email,
      // deterministic fake wallet from email so flows are stable across calls
      wallet: (`0x${Buffer.from(email).toString("hex").padEnd(40, "0").slice(0, 40)}`) as `0x${string}`,
    };
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer /i, "");
  if (!token) throw new Error("Missing Authorization bearer token");

  const claims = await privy().verifyAuthToken(token);
  const user = await privy().getUser(claims.userId);

  const emailAccount = user.linkedAccounts.find((a) => a.type === "email") as { address?: string } | undefined;
  const email = user.email?.address || user.google?.email || emailAccount?.address;
  const wallet = user.wallet?.address as `0x${string}` | undefined;

  if (!email) throw new Error("Privy user has no email");
  return { privyId: claims.userId, email, wallet: wallet ?? null };
}
