-- Logged-out visitors get no access to the ledgers table at all.
--
-- Supabase gives the "anon" (logged-out) role access to new tables by
-- default. Row Level Security already hides every row from it, but then a
-- logged-out request quietly gets "no ledger" back, which looks like an
-- empty account. With access removed, such a request fails loudly instead.
--
-- Run once in the Supabase SQL Editor.

revoke all on public.ledgers from anon;
