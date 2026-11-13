-- Delete a whole household (PRD §4.1).
-- Only the owner may do this. Deleting the households row cascades to household_members,
-- categories, trackers, and expenses (all reference households ... on delete cascade), so every
-- member is left without a household and lands on onboarding again. Profiles stay.
-- Households have no delete grant or policy: this RPC is the only way.

create function public.delete_household() returns json
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_member  public.household_members%rowtype;
  v_hh      public.households%rowtype;
  v_members int;
  v_months  int;
  v_count   int;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_member from public.household_members where user_id = v_uid;
  if not found then
    raise exception 'NOT_IN_HOUSEHOLD';
  end if;

  -- Lock the household so a concurrent join or tracker creation can't slip in.
  select * into v_hh from public.households where id = v_member.household_id for update;
  if v_hh.owner_id is distinct from v_uid then
    raise exception 'NOT_OWNER';
  end if;

  select count(*) into v_members from public.household_members where household_id = v_hh.id;
  select count(*) into v_months  from public.trackers          where household_id = v_hh.id;
  select count(*) into v_count   from public.expenses          where household_id = v_hh.id;

  delete from public.households where id = v_hh.id;

  return json_build_object(
    'household_name', v_hh.name,
    'member_count', v_members,
    'tracker_count', v_months,
    'expense_count', v_count);
end
$$;

revoke execute on function public.delete_household() from public, anon;
grant execute on function public.delete_household() to authenticated;
