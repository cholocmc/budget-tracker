-- Each category gets a monthly allocation (PRD §4.4.7): the amount the household plans to spend
-- on it each month. Categories are shared across months, so the allocation is too.
-- Integer centavos like every other amount.

alter table public.categories
  add column allocated_cents bigint not null default 0 check (allocated_cents >= 0);
