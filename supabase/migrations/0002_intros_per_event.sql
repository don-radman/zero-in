-- Intros consent moved from account-level to per-event (decided Sat morning):
-- members opt in or out when they zero in at each event. users.consent_scope
-- stays as a legacy default; matching reads intents.intros_enabled.
alter table intents add column intros_enabled boolean not null default true;
