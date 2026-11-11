-- Delete a monthly tracker and all of its expenses (PRD §4.3, §8).
-- Any member may delete one of their household's trackers. Expenses go with it via
-- expenses.tracker_id ... on delete cascade; categories are shared across months and stay.
-- Trackers still have no direct delete policy or grant: this RPC is the only way.

create function public.delete_tracker(p_tracker_id uuid) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_hid      uuid := public.my_household_id();
  v_tracker  public.trackers%rowtype;
  v_count    int;
  v_budgeted bigint;
  v_actual   bigint;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_hid is null then
    raise exception 'NOT_IN_HOUSEHOLD';
  end if;

  -- Lock the row so a concurrent expense insert can't slip in between the count and the delete.
  select * into v_tracker from public.trackers
   where id = p_tracker_id and household_id = v_hid
   for update;
  if not found then
    raise exception 'TRACKER_NOT_FOUND';
  end if;

  select count(*), coalesce(sum(budgeted_cents), 0), coalesce(sum(actual_cents), 0)
    into v_count, v_budgeted, v_actual
    from public.expenses
   where tracker_id = v_tracker.id;

  delete from public.trackers where id = v_tracker.id;

  return json_build_object(
    'year', v_tracker.year,
    'month', v_tracker.month,
    'expense_count', v_count,
    'budgeted_cents', v_budgeted,
    'actual_cents', v_actual);
end
$$;

revoke execute on function public.delete_tracker(uuid) from public, anon;
grant execute on function public.delete_tracker(uuid) to authenticated;
