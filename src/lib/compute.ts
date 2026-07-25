// 0G Compute Router: OpenAI-compatible endpoint. ALL inference and image gen
// goes through here (submission requires proof of 0G Compute usage).
// Every call appends a receipt line to docs/compute-proof.md via logComputeReceipt.

import OpenAI from "openai";

export function routerClient() {
  const apiKey = process.env.ROUTER_API_KEY;
  if (!apiKey) throw new Error("ROUTER_API_KEY not set (get one at pc.0g.ai)");
  return new OpenAI({
    apiKey,
    baseURL: process.env.ROUTER_BASE_URL || "https://router-api.0g.ai/v1",
  });
}

// Default chat model; confirm against GET /v1/models (spike-compute prints the list).
export const CHAT_MODEL = process.env.ROUTER_CHAT_MODEL || "zai-org/GLM-5-FP8";

export type ComputeReceipt = {
  when: string;
  kind: "chat" | "image" | "models";
  model: string;
  requestId?: string;
  provider?: string;
  note?: string;
};

// TODO(P0): server-side append to docs/compute-proof.md (fs in route handlers / scripts only).
export async function logComputeReceipt(receipt: ComputeReceipt): Promise<void> {
  console.log("[compute-receipt]", JSON.stringify(receipt));
}

// TODO(P1): match-run prompt (pair candidates -> reason + shared window, JSON out).
// TODO(P1): intro message generation (attribution to initiating panda + time/place).
// TODO(P2): Ask-the-Room aggregate synthesis (cohort >= 5 only).
