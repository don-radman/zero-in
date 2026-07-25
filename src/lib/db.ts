// Supabase server client (service role). Server-only: RLS is enabled with no
// policies, so this key is the only way in. Never import from client components.
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { tierFor } from "./gravity";

let cached: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

/** Add gravity to a user's agent and recompute tier. Returns new totals. */
export async function addGravity(userId: string, amount: number) {
  const client = db();
  const { data: agent, error } = await client
    .from("agents")
    .select("gravity")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  const gravity = (agent?.gravity ?? 0) + amount;
  const tier = tierFor(gravity);
  const { error: upErr } = await client
    .from("agents")
    .update({ gravity, tier })
    .eq("user_id", userId);
  if (upErr) throw upErr;
  return { gravity, tier };
}
