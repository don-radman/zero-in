// Privy server-side helpers: verify auth tokens from the client, look up the
// user's embedded wallet address. Client-side provider lives in app providers.

// TODO(P0): verifyPrivyToken(authToken) -> { privyId, email, wallet } using @privy-io/server-auth
// TODO(P0): typed-data signing flow for authorizeUsageWithSig (user signs EIP-712 in Privy,
// relayer submits; users never pay gas).
export {};
