-- Set when the AI portrait failed flag verification (vision check on 0G
-- Compute) even after a retry: the UI then renders the crisp flag overlay.
alter table agents add column flag_overlay boolean not null default false;
