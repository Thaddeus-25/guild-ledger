-- Guild Ledger's database setup for Supabase.
--
-- Already run in the pixel-ledger project on 2026-10-30. Don't edit this
-- file; put any later change in a new file in supabase/migrations/.

-- One row per user, holding that user's whole ledger.
create table public.ledgers (
  user_id    uuid primary key default auth.uid()
             references auth.users (id) on delete cascade,
  data       jsonb not null,
  version    integer not null default 1 check (version >= 1),
  updated_at timestamptz not null default now()
);

-- Privacy: turn on Row Level Security, then allow each user
-- to touch ONLY their own row.
alter table public.ledgers enable row level security;

create policy "Read own ledger" on public.ledgers
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Create own ledger" on public.ledgers
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Update own ledger" on public.ledgers
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Let logged-in users use the table through the API.
-- (Logged-out visitors get nothing.)
grant select, insert, update on public.ledgers to authenticated;

-- Keep updated_at correct automatically on every save.
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger ledgers_touch_updated_at
  before update on public.ledgers
  for each row execute function public.touch_updated_at();
