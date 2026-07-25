-- Zero-In operational schema (Ring 3: app DB). Individual answers and agent
-- memory NEVER live here in plaintext; they are encrypted to 0G Storage with
-- the root hash committed on-chain. This DB holds operational state only.
-- Apply via Supabase SQL editor or MCP once the project exists.

create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  wallet text unique,
  privy_id text unique,
  country text,                       -- ISO 3166-1 alpha-2, drives the backpack flag
  socials jsonb default '{}'::jsonb,  -- { x, github, farcaster, linkedin } plain text, no OAuth in MVP
  consent_scope text not null default 'event' check (consent_scope in ('event', 'community', 'off')),
  created_at timestamptz not null default now()
);

create table agents (
  user_id uuid primary key references users(id) on delete cascade,
  token_id bigint unique,             -- ZeroInAgent tokenId
  agent_id_8004 bigint,               -- ERC-8004 Identity Registry agentId
  memory_root text,                   -- latest 0G Storage merkle root
  panda_image_url text,
  panda_prompt text,
  panda_fallback boolean not null default false, -- true if procedural SVG (image gen tripwire)
  gravity integer not null default 0,
  tier text not null default 'Cadet',
  mint_tx text,
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  chain_event_id bigint unique,       -- ZeroInPatches eventId (set after on-chain createEvent)
  issuer_id uuid references users(id),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  cap integer not null default 0,     -- 0 = uncapped
  claim_key text not null,            -- static key baked into NFC URL (venue-attested-lite)
  ask_the_room text,                  -- the issuer's one custom question
  patch_art_url text,
  trust_tier text not null default 'venue',
  flagship boolean not null default false, -- flagship events grant +30 gravity instead of +20
  created_at timestamptz not null default now()
);

create table patches (
  event_id uuid references events(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  edition integer not null,
  tx_hash text,
  emoji_pulse text,                   -- single optional emoji at claim, only satisfaction signal
  debrief_done boolean not null default false,
  claimed_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table intents (
  user_id uuid references users(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  looking_for text,                   -- what you seek HERE (matching input)
  logistics jsonb default '{}'::jsonb, -- { flies_out: "...", side_events: [...] }
  ask_room_answered boolean not null default false, -- answer itself is encrypted to 0G Storage
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create table suggestions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  user_a uuid references users(id) on delete cascade,
  user_b uuid references users(id) on delete cascade,
  reason text not null,               -- generated on 0G Compute
  time_window text,                   -- shared logistics window
  status text not null default 'pending'
    check (status in ('pending', 'a_yes', 'b_yes', 'matched', 'expired')),
  intro_message text,                 -- generated on double opt-in
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (event_id, user_a, user_b)
);

-- Mirror index of what was pushed to 0G Storage (content itself is encrypted there)
create table memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  kind text not null,                 -- 'profile' | 'intent' | 'patch' | 'met' | 'debrief' | 'ask_room'
  summary text,                       -- short plaintext label for "what my panda knows" screen
  storage_root text,                  -- 0G Storage merkle root of the encrypted blob
  chain_tx text,                      -- appendIntelligentData tx if committed
  created_at timestamptz not null default now()
);

create index idx_patches_user on patches(user_id);
create index idx_suggestions_event on suggestions(event_id);
create index idx_suggestions_users on suggestions(user_a, user_b);
create index idx_memories_user on memories(user_id, created_at desc);
create index idx_intents_event on intents(event_id);

-- Server-only access: the app uses the service-role key. Enable RLS with no
-- policies so anon/authenticated Supabase clients can read nothing.
alter table users enable row level security;
alter table agents enable row level security;
alter table events enable row level security;
alter table patches enable row level security;
alter table intents enable row level security;
alter table suggestions enable row level security;
alter table memories enable row level security;
