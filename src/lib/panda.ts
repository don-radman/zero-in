// Panda visual system: generate the portrait ONCE at onboarding (Router image gen),
// then layer deterministic SVG overlays forever (flag, patches, tier aura).
// NEVER AI-generate flags: they mangle. Fallback tripwire: procedural SVG panda.

export type PandaTraits = {
  country: string; // ISO 3166-1 alpha-2, drives the backpack flag overlay
  interest: string; // maps to accessory (builder -> utility belt, DeFi -> holo-visor, ...)
  vibe: string; // one adjective from free-text answer
  palette: string; // color pick
};

const ACCESSORY: Record<string, string> = {
  builder: "wearing a small utility belt with tiny tools",
  defi: "wearing a sleek holographic visor",
  artist: "with paint-splash accents on the suit",
  researcher: "holding a small glowing data-pad",
  community: "with a tiny megaphone clipped to the suit",
  gaming: "with a retro game controller clipped to the belt",
};

export function pandaPrompt(traits: PandaTraits): string {
  const accessory = ACCESSORY[traits.interest] || ACCESSORY.builder;
  return (
    "Cute astronaut panda character, flat vector sticker style, centered, facing forward, " +
    `full body, white background, wearing a space suit with a small backpack, ${accessory}, ` +
    `${traits.vibe} expression, ${traits.palette} accent colors on the suit`
  );
}

// TODO(P0): generate(traits) -> image via Router /v1/images/generations (b64_json),
// upload to 0G Storage + cache URL in DB.
// TODO(tripwire Sat 19:00): proceduralPanda(traits, seed) -> SVG string fallback.
