"use client";
// Client-side fetch helper: attaches the Privy access token when Privy is
// configured, otherwise the dev email header (matching DEV_FAKE_AUTH server
// bypass). Keeps every page's fetch logic identical.

export function devMode(): boolean {
  return !process.env.NEXT_PUBLIC_PRIVY_APP_ID;
}

export function getDevEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("zeroin.devEmail");
}

export function setDevEmail(email: string) {
  window.localStorage.setItem("zeroin.devEmail", email);
}

export async function authedFetch(
  path: string,
  init: RequestInit = {},
  accessToken?: string | null
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  } else if (devMode()) {
    const email = getDevEmail();
    if (email) headers.set("x-dev-email", email);
  }
  return fetch(path, { ...init, headers });
}
