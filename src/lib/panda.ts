// Panda visual system: generate the portrait ONCE at onboarding (Router image
// gen), then layer deterministic SVG overlays forever (flag, patches, tier
// aura). NEVER AI-generate flags: they mangle. If the Router is missing or
// flaky, proceduralPanda() renders a flat-vector SVG panda from the same
// traits so the flow never blocks.
//
// Look is driven by three answers: country (flag on backpack + flag-color
// suit trim), world(s) (accessories, up to two), favorite color (fur/suit
// highlights). Plus a per-member seed for ear tilt, stars, blush, antenna.
import crypto from "crypto";
import { routerClient } from "./compute";
import { FLAG_COLORS } from "./countries";

export type PandaTraits = {
  country: string; // ISO 3166-1 alpha-2
  worlds: string[]; // selected worlds (builder, defi, artist, ...)
  worldOther?: string; // free text when "other" is picked
  vibe: string;
  palette: string; // favorite color key
};

const ACCESSORY_PROMPT: Record<string, string> = {
  builder: "wearing a small utility belt with tiny tools",
  founder: "with a small gold captain's star pinned on the chest",
  defi: "wearing a sleek holographic visor",
  vc: "holding a tiny leather briefcase",
  marketing: "with a small holographic chart floating beside it",
  operations: "with a neat clipboard and a tiny wrench clipped to the belt",
  artist: "with paint-splash accents on the suit",
  researcher: "holding a small glowing data-pad",
  community: "with a tiny megaphone clipped to the suit",
  gaming: "with a retro game controller clipped to the belt",
};

export const PALETTES: Record<string, { accent: string; soft: string }> = {
  red: { accent: "#E5484D", soft: "#FCE9E9" },
  orange: { accent: "#FF8A3D", soft: "#FFEEDF" },
  yellow: { accent: "#F5C518", soft: "#FBF4D5" },
  green: { accent: "#4CC26B", soft: "#E4F7E9" },
  teal: { accent: "#18B8A6", soft: "#DFF7F4" },
  blue: { accent: "#3B82F6", soft: "#E0ECFF" },
  purple: { accent: "#7C5CFF", soft: "#EDE8FF" },
  pink: { accent: "#F464A8", soft: "#FDE7F1" },
  silver: { accent: "#8A93A6", soft: "#EEF1F6" },
};

function paletteOf(traits: PandaTraits) {
  return PALETTES[traits.palette] || PALETTES.purple;
}

function accessoryText(traits: PandaTraits): string {
  const accessories = traits.worlds
    .slice(0, 2)
    .map((w) => ACCESSORY_PROMPT[w])
    .filter(Boolean);
  if (traits.worldOther) accessories.push(`with a subtle nod to ${traits.worldOther}`);
  return accessories.length ? accessories.join(", ") : ACCESSORY_PROMPT.builder;
}

/** Flat-vector prompt (0G Router image models). */
export function pandaPrompt(traits: PandaTraits): string {
  return (
    "Cute astronaut panda character, flat vector sticker style, centered, facing forward, " +
    `full body, white background, wearing a space suit with a small backpack, ${accessoryText(traits)}, ` +
    `${traits.vibe} expression, ${paletteOf(traits).accent} accent colors on the suit and fur highlights`
  );
}

/** Hyper-real wow-factor prompt (Gemini nano banana). Flags stay overlays. */
export function bananaPrompt(traits: PandaTraits): string {
  const { accent } = paletteOf(traits);
  const [trimA, trimB] = FLAG_COLORS[traits.country] || ["#8A93A6", "#EEF1F6"];
  return (
    "An adorable baby panda astronaut, hyper-detailed Pixar-quality 3D render, ultra-fluffy fur, " +
    `huge glossy expressive eyes, joyful ${traits.vibe} expression, wearing a crisp white space suit ` +
    `with ${accent} accent highlights in the fur tips and suit panels, two thin chest trim stripes ` +
    `colored ${trimA} and ${trimB}, ${accessoryText(traits)}, compact backpack over one shoulder, ` +
    "soft cinematic studio lighting, gentle star bokeh background, centered square portrait, " +
    "shot like a premium character poster, no text, no logos, no flags"
  );
}

/** Gemini image generation (nano banana). Returns b64 png or null. */
async function nanoBanana(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    const inline = p.inlineData || p.inline_data;
    if (inline?.data) return inline.data;
  }
  return null;
}

export type PandaResult =
  | { kind: "ai"; dataUrl: string; prompt: string }
  | { kind: "svg"; dataUrl: string; prompt: string };

/** Provider chain: Gemini nano banana (preferred) -> 0G Router -> procedural
 *  SVG. Never throws. Portraits are the one non-0G inference (stated openly
 *  in the README); all agent reasoning runs on the 0G Compute Router. */
export async function generatePanda(traits: PandaTraits): Promise<PandaResult> {
  if (process.env.GEMINI_API_KEY) {
    try {
      const b64 = await nanoBanana(bananaPrompt(traits));
      if (b64) return { kind: "ai", dataUrl: `data:image/png;base64,${b64}`, prompt: bananaPrompt(traits) };
    } catch (e) {
      console.error("[panda] nano banana failed, trying next provider:", e instanceof Error ? e.message : e);
    }
  }
  const prompt = pandaPrompt(traits);
  if (process.env.ROUTER_API_KEY) {
    try {
      const client = routerClient();
      const res = await client.images.generate({
        ...(process.env.ROUTER_IMAGE_MODEL ? { model: process.env.ROUTER_IMAGE_MODEL } : {}),
        prompt,
        response_format: "b64_json",
      } as any);
      const b64 = res.data?.[0]?.b64_json;
      if (b64) return { kind: "ai", dataUrl: `data:image/png;base64,${b64}`, prompt };
    } catch (e) {
      console.error("[panda] router image gen failed, using procedural fallback:", e instanceof Error ? e.message : e);
    }
  }
  const svg = proceduralPanda(traits);
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return { kind: "svg", dataUrl, prompt };
}

/**
 * Flat-vector astronaut panda, deterministic from traits. 512x512 viewBox.
 * Country -> flag-color trim stripes; worlds -> up to two accessories;
 * favorite color -> suit belly, helmet ring, ear tint, blush.
 */
export function proceduralPanda(traits: PandaTraits): string {
  const { accent, soft } = paletteOf(traits);
  const [trimA, trimB] = FLAG_COLORS[traits.country] || ["#8A93A6", "#EEF1F6"];
  const seed = crypto.createHash("sha256").update(JSON.stringify(traits)).digest();
  const r = (i: number, lo: number, hi: number) => lo + (seed[i % 32] / 255) * (hi - lo);

  const earTilt = r(0, -8, 8);
  const blush = seed[1] > 100;
  const antenna = seed[2] > 128;
  const stars = Array.from({ length: 7 }, (_, i) => {
    const x = r(3 + i, 30, 482).toFixed(0);
    const y = r(11 + i, 30, 200).toFixed(0);
    const s = r(19 + i, 1.5, 4).toFixed(1);
    return `<circle cx="${x}" cy="${y}" r="${s}" fill="${accent}" opacity="0.35"/>`;
  }).join("");

  const ACCESSORY_SVG: Record<string, string> = {
    founder: `<path d="M246 268 l6 12 13 2 -9 9 2 13 -12 -6 -12 6 2 -13 -9 -9 13 -2 z" fill="#F5C518" stroke="#2b2d33" stroke-width="2"/>`,
    vc: `<rect x="150" y="352" width="52" height="38" rx="6" fill="#8B5A2B" stroke="#2b2d33" stroke-width="3"/><rect x="168" y="344" width="16" height="10" rx="3" fill="#8B5A2B" stroke="#2b2d33" stroke-width="3"/>`,
    marketing: `<rect x="316" y="330" width="56" height="44" rx="6" fill="${accent}" opacity="0.85"/><path d="M324 362 l12 -12 10 6 14 -16" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    operations: `<rect x="152" y="342" width="40" height="52" rx="6" fill="#fff" stroke="#2b2d33" stroke-width="3"/><rect x="160" y="338" width="24" height="10" rx="3" fill="${accent}"/><rect x="158" y="356" width="28" height="5" rx="2" fill="${accent}" opacity="0.7"/><rect x="158" y="366" width="28" height="5" rx="2" fill="${accent}" opacity="0.5"/>`,
    builder: `<rect x="180" y="382" width="152" height="22" rx="11" fill="${accent}"/><rect x="216" y="378" width="26" height="30" rx="5" fill="${accent}"/><rect x="270" y="378" width="26" height="30" rx="5" fill="${accent}"/>`,
    defi: `<rect x="176" y="196" width="160" height="34" rx="17" fill="${accent}" opacity="0.55"/>`,
    artist: `<circle cx="200" cy="360" r="9" fill="${accent}"/><circle cx="316" cy="345" r="6" fill="${accent}" opacity="0.7"/><circle cx="240" cy="392" r="5" fill="${accent}" opacity="0.5"/>`,
    researcher: `<rect x="308" y="352" width="52" height="66" rx="8" fill="${accent}"/><rect x="316" y="362" width="36" height="8" rx="3" fill="#fff" opacity="0.8"/><rect x="316" y="376" width="26" height="6" rx="3" fill="#fff" opacity="0.6"/>`,
    community: `<path d="M150 350 l40 -14 v40 l-40 -14 z" fill="${accent}"/><rect x="188" y="342" width="10" height="28" rx="4" fill="${accent}"/>`,
    gaming: `<rect x="212" y="382" width="88" height="40" rx="18" fill="${accent}"/><circle cx="238" cy="402" r="7" fill="#fff"/><circle cx="276" cy="402" r="7" fill="#fff"/>`,
  };
  const accessories = traits.worlds
    .slice(0, 2)
    .map((w) => ACCESSORY_SVG[w])
    .filter(Boolean)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="${soft}"/>
  ${stars}
  <!-- backpack + flag pole (real flag overlaid by the app from ${traits.country}) -->
  <rect x="330" y="230" width="96" height="130" rx="26" fill="${accent}" opacity="0.9"/>
  <rect x="398" y="128" width="8" height="120" rx="4" fill="#5b5f6b"/>
  <rect x="406" y="128" width="64" height="42" rx="6" fill="#fff" stroke="#5b5f6b" stroke-width="3" data-flag-anchor="true"/>
  <!-- body / suit -->
  <ellipse cx="246" cy="360" rx="118" ry="104" fill="#ffffff" stroke="#2b2d33" stroke-width="7"/>
  <ellipse cx="246" cy="378" rx="72" ry="62" fill="${soft}"/>
  <!-- flag-color trim stripes (country signature) -->
  <rect x="196" y="300" width="100" height="10" rx="5" fill="${trimA}"/>
  <rect x="196" y="316" width="100" height="10" rx="5" fill="${trimB}" stroke="#2b2d33" stroke-width="0.5"/>
  ${accessories || ACCESSORY_SVG.builder}
  <!-- arms -->
  <ellipse cx="140" cy="330" rx="34" ry="52" fill="#2b2d33" transform="rotate(18 140 330)"/>
  <ellipse cx="352" cy="330" rx="34" ry="52" fill="#2b2d33" transform="rotate(-18 352 330)"/>
  <!-- head -->
  <g transform="rotate(${earTilt.toFixed(1)} 246 178)">
    <circle cx="156" cy="96" r="38" fill="#2b2d33"/>
    <circle cx="156" cy="96" r="18" fill="${accent}" opacity="0.55"/>
    <circle cx="336" cy="96" r="38" fill="#2b2d33"/>
    <circle cx="336" cy="96" r="18" fill="${accent}" opacity="0.55"/>
    <circle cx="246" cy="170" r="112" fill="#ffffff" stroke="#2b2d33" stroke-width="7"/>
    <ellipse cx="196" cy="160" rx="30" ry="38" fill="#2b2d33" transform="rotate(-14 196 160)"/>
    <ellipse cx="296" cy="160" rx="30" ry="38" fill="#2b2d33" transform="rotate(14 296 160)"/>
    <circle cx="202" cy="156" r="10" fill="#fff"/>
    <circle cx="290" cy="156" r="10" fill="#fff"/>
    <circle cx="204" cy="153" r="4" fill="#2b2d33"/>
    <circle cx="288" cy="153" r="4" fill="#2b2d33"/>
    <path d="M236 206 q10 10 20 0" stroke="#2b2d33" stroke-width="6" fill="none" stroke-linecap="round"/>
    <ellipse cx="246" cy="196" rx="12" ry="8" fill="#2b2d33"/>
    ${blush ? `<circle cx="168" cy="196" r="12" fill="${accent}" opacity="0.35"/><circle cx="324" cy="196" r="12" fill="${accent}" opacity="0.35"/>` : ""}
  </g>
  <!-- helmet ring -->
  <circle cx="246" cy="170" r="126" fill="none" stroke="${accent}" stroke-width="10" opacity="0.65"/>
  ${antenna ? `<line x1="246" y1="40" x2="246" y2="16" stroke="${accent}" stroke-width="6" stroke-linecap="round"/><circle cx="246" cy="12" r="7" fill="${accent}"/>` : ""}
</svg>`;
}
