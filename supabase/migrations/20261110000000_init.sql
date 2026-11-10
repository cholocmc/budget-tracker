-- Monthly Budget Tracker: schema, triggers, RLS, RPCs and realtime (PRD §5, §6.6, §8).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create table public.households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 50 and name = btrim(name)),
  code       text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'),
  owner_id   uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PRIMARY KEY (user_id) is the database guarantee of "one household per user".
create table public.household_members (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  role         text not null check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now()
);
create index household_members_household_id_idx on public.household_members (household_id);

create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 40 and name = btrim(name)),
  color        text not null check (color in (
                 '#22D88F', '#16B8C9', '#9BD93B', '#7B6CF0', '#F2B53C',
                 '#EF6F8E', '#3FA7F5', '#1F8F6A', '#C97CF2', '#F28A3C')),
  -- Not in the PRD schema: used for the "{member} just updated this" notice (§6.6).
  updated_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index categories_household_name_ci on public.categories (household_id, lower(name));

create table public.trackers (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  year         int  not null check (year between 2000 and 2100),
  month        int  not null check (month between 1 and 12),
  created_at   timestamptz not null default now(),
  unique (household_id, year, month)
);

create table public.expenses (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households(id) on delete cascade,
  tracker_id     uuid not null references public.trackers(id) on delete cascade,
  category_id    uuid not null references public.categories(id) on delete cascade,
  name           text not null check (char_length(btrim(name)) between 1 and 60 and name = btrim(name)),
  budgeted_cents bigint not null default 0 check (budgeted_cents >= 0),
  actual_cents   bigint not null default 0 check (actual_cents >= 0),
  owner_id       uuid not null references public.profiles(id),
  due_date       date not null,
  created_by     uuid references public.profiles(id) on delete set null,
  updated_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index expenses_tracker_id_idx   on public.expenses (tracker_id);
create index expenses_household_id_idx on public.expenses (household_id);
create index expenses_category_id_idx  on public.expenses (category_id);
create index expenses_owner_id_idx     on public.expenses (owner_id);

-- Rate limiting for household code lookups (§8).
create table public.code_lookup_attempts (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  ip           text,
  attempted_at timestamptz not null default now()
);
create index code_lookup_attempts_user_idx on public.code_lookup_attempts (user_id, attempted_at);
create index code_lookup_attempts_ip_idx   on public.code_lookup_attempts (ip, attempted_at);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.my_household_id() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from public.household_members where user_id = auth.uid()
$$;

-- 8 random characters from the 32-letter alphabet (no 0, O, 1, I), formatted XXXX-XXXX.
-- 256 is a multiple of 32, so "byte % 32" is uniform.
create function public.generate_household_code() returns text
language plpgsql volatile set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  result text := '';
begin
  for i in 0..7 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
    if i = 3 then
      result := result || '-';
    end if;
  end loop;
  return result;
end
$$;

-- Accepts any casing, spaces or hyphens. Returns XXXX-XXXX or raises INVALID_CODE_FORMAT.
create function public.normalize_household_code(p_code text) returns text
language plpgsql immutable set search_path = public as $$
declare
  raw text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if char_length(raw) <> 8 or raw ~ '[01OI]' then
    raise exception 'INVALID_CODE_FORMAT';
  end if;
  return substr(raw, 1, 4) || '-' || substr(raw, 5, 4);
end
$$;

-- Makes sure the caller has a profiles row (covers users created before the trigger existed).
create function public.ensure_profile() returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  select u.id,
         coalesce(nullif(u.raw_user_meta_data->>'full_name', ''),
                  nullif(u.raw_user_meta_data->>'name', ''),
                  nullif(split_part(u.email, '@', 1), ''),
                  'Member'),
         coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
  from auth.users u
  where u.id = auth.uid()
  on conflict (id) do nothing;
end
$$;

-- Throws RATE_LIMITED when the caller (or their IP) has made too many code attempts recently.
create function public.check_code_rate_limit() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_ip text;
  v_user_count int;
  v_ip_count int;
begin
  begin
    v_ip := nullif(btrim(split_part(
      coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1)), '');
  exception when others then
    v_ip := null;
  end;

  delete from public.code_lookup_attempts where attempted_at < now() - interval '1 day';

  select count(*) into v_user_count from public.code_lookup_attempts
   where user_id = auth.uid() and attempted_at > now() - interval '10 minutes';
  if v_user_count >= 10 then
    return 'RATE_LIMITED';
  end if;

  if v_ip is not null then
    select count(*) into v_ip_count from public.code_lookup_attempts
     where ip = v_ip and attempted_at > now() - interval '10 minutes';
    if v_ip_count >= 30 then
      return 'RATE_LIMITED';
    end if;
  end if;

  insert into public.code_lookup_attempts (user_id, ip) values (auth.uid(), v_ip);
  return null;
end
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger households_updated_at before update on public.households
  for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger expenses_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

create function public.categories_stamp() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;
  return new;
end
$$;
create trigger categories_stamp before insert or update on public.categories
  for each row execute function public.categories_stamp();

create function public.expenses_validate() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_tracker public.trackers%rowtype;
  v_cat_household uuid;
begin
  select * into v_tracker from public.trackers where id = new.tracker_id;
  if not found then
    raise exception 'TRACKER_NOT_FOUND';
  end if;
  if new.household_id <> v_tracker.household_id then
    raise exception 'HOUSEHOLD_MISMATCH';
  end if;

  select household_id into v_cat_household from public.categories where id = new.category_id;
  if v_cat_household is distinct from new.household_id then
    raise exception 'HOUSEHOLD_MISMATCH';
  end if;

  if extract(year from new.due_date)::int <> v_tracker.year
     or extract(month from new.due_date)::int <> v_tracker.month then
    raise exception 'DUE_DATE_OUT_OF_MONTH';
  end if;

  if not exists (select 1 from public.household_members
                  where user_id = new.owner_id and household_id = new.household_id) then
    raise exception 'OWNER_NOT_MEMBER';
  end if;

  if auth.uid() is not null then
    new.updated_by := auth.uid();
    if tg_op = 'INSERT' then
      new.created_by := auth.uid();
    end if;
  end if;
  return new;
end
$$;
create trigger expenses_validate before insert or update on public.expenses
  for each row execute function public.expenses_validate();

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''),
             nullif(new.raw_user_meta_data->>'name', ''),
             nullif(split_part(new.email, '@', 1), ''),
             'Member'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security (§5.2)
-- ---------------------------------------------------------------------------

alter table public.profiles             enable row level security;
alter table public.households           enable row level security;
alter table public.household_members    enable row level security;
alter table public.categories           enable row level security;
alter table public.trackers             enable row level security;
alter table public.expenses             enable row level security;
alter table public.code_lookup_attempts enable row level security;

-- profiles: your own row, plus people in your household. Update your own row only.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid()
         or id in (select user_id from public.household_members where household_id = public.my_household_id()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- households: members read; members may update the name only (column grant below).
create policy households_select on public.households for select to authenticated
  using (id = public.my_household_id());
create policy households_update on public.households for update to authenticated
  using (id = public.my_household_id()) with check (id = public.my_household_id());

-- household_members: read your household. Writes go through RPCs only.
create policy household_members_select on public.household_members for select to authenticated
  using (household_id = public.my_household_id());

-- categories and expenses: full access for every member of the household.
create policy categories_all on public.categories for all to authenticated
  using (household_id = public.my_household_id())
  with check (household_id = public.my_household_id());

create policy expenses_all on public.expenses for all to authenticated
  using (household_id = public.my_household_id())
  with check (household_id = public.my_household_id());

-- trackers: read only. Inserted through create_tracker. No update or delete in v1.
create policy trackers_select on public.trackers for select to authenticated
  using (household_id = public.my_household_id());

-- code_lookup_attempts: no policies, so no direct access.

-- Table privileges: nothing for anon, and only what each table allows for authenticated.
revoke all on public.profiles, public.households, public.household_members, public.categories,
              public.trackers, public.expenses, public.code_lookup_attempts from anon;
revoke all on public.households, public.household_members, public.trackers,
              public.code_lookup_attempts from authenticated;
revoke insert, update, delete, truncate on public.profiles from authenticated;
grant select on public.households, public.household_members, public.trackers to authenticated;
grant update (name) on public.households to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs (§8). Each runs in one transaction and checks auth.uid() itself.
-- ---------------------------------------------------------------------------

create function public.create_household(p_name text) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_id   uuid;
  v_code text;
  v_try  int := 0;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if exists (select 1 from public.household_members where user_id = v_uid) then
    raise exception 'ALREADY_IN_HOUSEHOLD';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 50 then
    raise exception 'INVALID_NAME';
  end if;

  perform public.ensure_profile();

  loop
    v_try := v_try + 1;
    v_code := public.generate_household_code();
    begin
      insert into public.households (name, code, owner_id)
      values (v_name, v_code, v_uid)
      returning id into v_id;
      exit;
    exception when unique_violation then
      if v_try >= 10 then
        raise;
      end if;
    end;
  end loop;

  begin
    insert into public.household_members (user_id, household_id, role)
    values (v_uid, v_id, 'owner');
  exception when unique_violation then
    raise exception 'ALREADY_IN_HOUSEHOLD';
  end;

  return json_build_object('id', v_id, 'name', v_name, 'code', v_code);
end
$$;

-- Returns { name, owner_name, member_count, members: [{ display_name, avatar_url }] },
-- or { error: 'NOT_FOUND' | 'RATE_LIMITED' }. These two come back as values instead of
-- exceptions so the attempt row is kept (an exception would roll it back).
create function public.lookup_household(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_code  text;
  v_limit text;
  v_hh    public.households%rowtype;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  v_code := public.normalize_household_code(p_code);

  v_limit := public.check_code_rate_limit();
  if v_limit is not null then
    return json_build_object('error', v_limit);
  end if;

  select * into v_hh from public.households where code = v_code;
  if not found then
    return json_build_object('error', 'NOT_FOUND');
  end if;

  return json_build_object(
    'name', v_hh.name,
    'owner_name', (select display_name from public.profiles where id = v_hh.owner_id),
    'member_count', (select count(*) from public.household_members where household_id = v_hh.id),
    'members', coalesce((
      select json_agg(json_build_object('display_name', p.display_name, 'avatar_url', p.avatar_url)
                      order by (m.role = 'owner') desc, m.joined_at)
      from public.household_members m join public.profiles p on p.id = m.user_id
      where m.household_id = v_hh.id), '[]'::json)
  );
end
$$;

-- Returns { id, name } or { error: 'NOT_FOUND' | 'RATE_LIMITED' } (see lookup_household).
create function public.join_household(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_code  text;
  v_limit text;
  v_hh    public.households%rowtype;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  v_code := public.normalize_household_code(p_code);
  if exists (select 1 from public.household_members where user_id = v_uid) then
    raise exception 'ALREADY_IN_HOUSEHOLD';
  end if;

  select * into v_hh from public.households where code = v_code;
  if not found then
    v_limit := public.check_code_rate_limit();
    return json_build_object('error', coalesce(v_limit, 'NOT_FOUND'));
  end if;

  perform public.ensure_profile();

  begin
    insert into public.household_members (user_id, household_id, role)
    values (v_uid, v_hh.id, 'member');
  exception when unique_violation then
    raise exception 'ALREADY_IN_HOUSEHOLD';
  end;

  return json_build_object('id', v_hh.id, 'name', v_hh.name);
end
$$;

create function public.leave_household() returns json
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_member public.household_members%rowtype;
  v_hh     public.households%rowtype;
  v_moved  int;
begin
  select * into v_member from public.household_members where user_id = v_uid;
  if not found then
    raise exception 'NOT_IN_HOUSEHOLD';
  end if;
  if v_member.role = 'owner' then
    raise exception 'OWNER_CANNOT_LEAVE';
  end if;
  select * into v_hh from public.households where id = v_member.household_id for update;
  if v_hh.owner_id = v_uid then
    raise exception 'OWNER_CANNOT_LEAVE';
  end if;

  update public.expenses set owner_id = v_hh.owner_id
   where household_id = v_hh.id and owner_id = v_uid;
  get diagnostics v_moved = row_count;

  delete from public.household_members where user_id = v_uid;

  return json_build_object('household_name', v_hh.name, 'reassigned', v_moved);
end
$$;

create function public.reset_household_code() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_hid  uuid := public.my_household_id();
  v_code text;
  v_try  int := 0;
begin
  if v_hid is null then
    raise exception 'NOT_IN_HOUSEHOLD';
  end if;
  loop
    v_try := v_try + 1;
    v_code := public.generate_household_code();
    begin
      update public.households set code = v_code where id = v_hid;
      exit;
    exception when unique_violation then
      if v_try >= 10 then
        raise;
      end if;
    end;
  end loop;
  return v_code;
end
$$;

-- Most recent tracker before (p_year, p_month) with at least one expense, grouped by category.
-- Returns null when there is none.
create function public.get_copy_source(p_year int, p_month int) returns json
language plpgsql stable security invoker set search_path = public as $$
declare
  v_hid     uuid := public.my_household_id();
  v_tracker public.trackers%rowtype;
begin
  if v_hid is null then
    return null;
  end if;

  select t.* into v_tracker
    from public.trackers t
   where t.household_id = v_hid
     and (t.year * 12 + t.month) < (p_year * 12 + p_month)
     and exists (select 1 from public.expenses e where e.tracker_id = t.id)
   order by t.year desc, t.month desc
   limit 1;
  if not found then
    return null;
  end if;

  return json_build_object(
    'tracker_id', v_tracker.id,
    'year', v_tracker.year,
    'month', v_tracker.month,
    'categories', (
      select json_agg(json_build_object(
               'id', c.id, 'name', c.name, 'color', c.color,
               'expenses', (
                 select json_agg(json_build_object(
                          'id', e.id, 'name', e.name,
                          'budgeted_cents', e.budgeted_cents, 'actual_cents', e.actual_cents,
                          'owner_id', e.owner_id, 'due_date', e.due_date)
                        order by e.due_date, e.created_at)
                 from public.expenses e
                 where e.tracker_id = v_tracker.id and e.category_id = c.id))
             order by c.created_at)
      from public.categories c
      where c.household_id = v_hid
        and exists (select 1 from public.expenses e where e.tracker_id = v_tracker.id and e.category_id = c.id))
  );
end
$$;

-- Creates the tracker (or returns the existing one on a unique conflict, skipping the copies)
-- and copies the selected expenses (§6.3.4).
create function public.create_tracker(
  p_year int,
  p_month int,
  p_copy_expense_ids uuid[] default '{}',
  p_include_actual bool default false
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_hid      uuid := public.my_household_id();
  v_tracker  public.trackers%rowtype;
  v_owner    uuid;
  v_last_day int;
  v_copied   int := 0;
begin
  if v_hid is null then
    raise exception 'NOT_IN_HOUSEHOLD';
  end if;
  if p_month is null or p_month not between 1 and 12 or p_year is null or p_year not between 2000 and 2100 then
    raise exception 'INVALID_MONTH';
  end if;

  insert into public.trackers (household_id, year, month)
  values (v_hid, p_year, p_month)
  on conflict (household_id, year, month) do nothing
  returning * into v_tracker;

  if v_tracker.id is null then
    select * into v_tracker from public.trackers
     where household_id = v_hid and year = p_year and month = p_month;
    return json_build_object('tracker', row_to_json(v_tracker), 'created', false, 'copied', 0);
  end if;

  select owner_id into v_owner from public.households where id = v_hid;
  v_last_day := extract(day from (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day'))::int;

  insert into public.expenses
    (household_id, tracker_id, category_id, name, budgeted_cents, actual_cents, owner_id, due_date)
  select v_hid, v_tracker.id, e.category_id, e.name, e.budgeted_cents,
         case when coalesce(p_include_actual, false) then e.actual_cents else 0 end,
         case when exists (select 1 from public.household_members m
                            where m.user_id = e.owner_id and m.household_id = v_hid)
              then e.owner_id else v_owner end,
         make_date(p_year, p_month, least(extract(day from e.due_date)::int, v_last_day))
    from public.expenses e
   where e.household_id = v_hid
     and e.id = any(coalesce(p_copy_expense_ids, '{}'::uuid[]))
   order by e.due_date, e.created_at;
  get diagnostics v_copied = row_count;

  return json_build_object('tracker', row_to_json(v_tracker), 'created', true, 'copied', v_copied);
end
$$;

create function public.category_delete_impact(p_category_id uuid) returns json
language sql stable security invoker set search_path = public as $$
  select json_build_object(
    'expense_count',  count(*),
    'month_count',    count(distinct e.tracker_id),
    'budgeted_cents', coalesce(sum(e.budgeted_cents), 0),
    'actual_cents',   coalesce(sum(e.actual_cents), 0))
  from public.expenses e
  where e.category_id = p_category_id and e.household_id = public.my_household_id()
$$;

-- Function privileges: RPCs for signed-in users only; helpers are internal.
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.my_household_id(),
  public.create_household(text),
  public.lookup_household(text),
  public.join_household(text),
  public.leave_household(),
  public.reset_household_code(),
  public.get_copy_source(int, int),
  public.create_tracker(int, int, uuid[], bool),
  public.category_delete_impact(uuid)
to authenticated;
revoke execute on function
  public.generate_household_code(),
  public.normalize_household_code(text),
  public.ensure_profile(),
  public.check_code_rate_limit()
from authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;

-- ---------------------------------------------------------------------------
-- Realtime (§6.6)
-- ---------------------------------------------------------------------------

alter table public.expenses          replica identity full;
alter table public.categories        replica identity full;
alter table public.household_members replica identity full;

alter publication supabase_realtime add table
  public.households,
  public.household_members,
  public.categories,
  public.trackers,
  public.expenses;
