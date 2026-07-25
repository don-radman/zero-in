-- Portrait traits stored per agent so the portrait can be (re)generated in a
-- separate, retryable step from account creation (battle-hardening pass).
alter table agents add column traits jsonb;
