-- Profile bank accounts (PRD §6.7).
-- Each user keeps a private list of bank and e-wallet balances. The rows belong to the user, not the
-- household: they reference auth.users, never households, so leaving or deleting a household, or
-- deleting a tracker, leaves them alone. Nobody else can read them, household members included.
-- Plain CRUD goes straight to the table; RLS limits every row to its owner.

create table public.bank_accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 40 and name = btrim(name)),
  -- Integer centavos, zero or more. The money input allows at most 12 integer digits.
  balance_cents bigint not null default 0 check (balance_cents >= 0 and balance_cents < 100000000000000),
  color         text not null check (color in (
                  '#22D88F', '#16B8C9', '#9BD93B', '#7B6CF0', '#F2B53C', '#EF6F8E', '#3FA7F5', '#1F8F6A',
                  '#C97CF2', '#F28A3C', '#D9434F', '#E35FC0', '#F7A8C8', '#3F51C8', '#A65F30', '#E8E05A')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- Also serves lookups by user_id.
create unique index bank_accounts_user_name_ci on public.bank_accounts (user_id, lower(name));

create trigger bank_accounts_updated_at before update on public.bank_accounts
  for each row execute function public.set_updated_at();

alter table public.bank_accounts enable row level security;

-- Only the owner of a row can see or change it. Not scoped by my_household_id() on purpose:
-- these rows aren't household data.
create policy bank_accounts_own on public.bank_accounts for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.bank_accounts from anon, authenticated;
grant select, delete on public.bank_accounts to authenticated;
-- user_id comes from its auth.uid() default and can't be changed afterwards.
grant insert (name, balance_cents, color) on public.bank_accounts to authenticated;
grant update (name, balance_cents, color) on public.bank_accounts to authenticated;
