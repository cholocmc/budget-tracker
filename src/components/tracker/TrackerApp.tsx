"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Footer } from "@/components/Footer";
import { useToast } from "@/components/Toast";
import {
  EXPENSE_COLUMNS,
  fetchCategories,
  fetchExpenses,
  fetchHousehold,
  fetchMembers,
  fetchTrackers,
  normalizeExpense,
} from "@/lib/data";
import { errorCode, errorMessage } from "@/lib/errors";
import { currentMonthKey, monthKey, monthLabel, parseMonthKey, plural } from "@/lib/format";
import { getSupabase } from "@/lib/supabase/client";
import type { Category, CopySource, DeleteImpact, Expense, Household, InitialData, Tracker } from "@/lib/types";
import {
  Ctx,
  ROWS_DEFAULT,
  SPLIT_DEFAULT,
  SPLIT_MAX,
  SPLIT_MIN,
  isRowOrder,
  type DialogState,
  type ExpenseInput,
  type Ops,
  type RowId,
  type Sort,
  type TrackerCtx,
  type ViewMode,
} from "./context";
import { Dialogs } from "./dialogs";
import { ChartSummary, ExpensesSection, Header, Kpis, MonthRail, EmptyMonth } from "./sections";
import { reducer, type TrackerState } from "./store";

const VIEW_KEY = "finance-tracker-view";
const SPLIT_KEY = "finance-tracker-split";
const ROWS_KEY = "finance-tracker-rows";




const CONFLICT_MSG = "Someone else changed this expense. Review the latest version and try again.";
const CATEGORY_CONFLICT_MSG = "Someone else changed this category. Review the latest version and try again.";

type Screen = { kind: "app" } | { kind: "left"; household: string };

export function TrackerApp({ initial }: { initial: InitialData }) {
  const sb = getSupabase();
  const toast = useToast();
  const me = initial.me;

  const [state, dispatch] = useReducer(reducer, initial, (init): TrackerState => {
    const expenses: Record<string, Expense[]> = {};
    if (init.initialMonth && init.initialExpenses) {
      const { y, m } = parseMonthKey(init.initialMonth);
      const t = init.trackers.find((x) => x.year === y && x.month === m);
      if (t) expenses[t.id] = init.initialExpenses;
    }
    return { household: init.household, members: init.members, categories: init.categories, trackers: init.trackers, expenses };
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  const [month, setMonth] = useState<string | null>(initial.initialMonth);
  const monthRef = useRef(month);
  monthRef.current = month;
  const [screen, setScreen] = useState<Screen>({ kind: "app" });
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [filterCat, setFilterCat] = useState("all");
  const [sort, setSort] = useState<Sort>({ key: "due", dir: "asc" });
  const [view, setViewState] = useState<ViewMode>("table");
  const [split, setSplitState] = useState(SPLIT_DEFAULT);
  const [rows, setRowsState] = useState<RowId[]>(ROWS_DEFAULT);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(true);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const ownWrites = useRef(new Set<string>());
  const deletedByRef = useRef(new Map<string, string>());
  const loadingRef = useRef(new Set<string>());

  /* ---------- Client-only setup: local month, saved preferences ---------- */
  useEffect(() => {
    if (!monthRef.current) setMonth(currentMonthKey());
    try {
      const v = localStorage.getItem(VIEW_KEY);
      setViewState(v === "list" || v === "table" ? v : window.innerWidth < 700 ? "list" : "table");
      const s = Number(localStorage.getItem(SPLIT_KEY));
      if (s >= SPLIT_MIN && s <= SPLIT_MAX) setSplitState(s);
      const r: unknown = JSON.parse(localStorage.getItem(ROWS_KEY) ?? "null");
      if (isRowOrder(r)) setRowsState(r);
    } catch {
      setViewState(window.innerWidth < 700 ? "list" : "table");
    }
  }, []);

  const setView = useCallback((v: ViewMode) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  }, []);
  const setSplit = useCallback((v: number, persist = true) => {
    const pct = Math.round(Math.max(SPLIT_MIN, Math.min(SPLIT_MAX, v)) * 10) / 10;
    setSplitState(pct);
    if (persist) {
      try {
        localStorage.setItem(SPLIT_KEY, String(pct));
      } catch {}
    }
  }, []);

  const setRows = useCallback((v: RowId[]) => {
    if (!isRowOrder(v)) return;
    setRowsState(v);
    try {
      localStorage.setItem(ROWS_KEY, JSON.stringify(v));
    } catch {}
  }, []);

  /* ---------- Derived ---------- */
  const trackerFor = useCallback(
    (k: string | null, trackers: Tracker[] = stateRef.current.trackers) => {
      if (!k) return undefined;
      const { y, m } = parseMonthKey(k);
      return trackers.find((t) => t.year === y && t.month === m);
    },
    [],
  );
  const tracker = trackerFor(month, state.trackers);
  const expenses = tracker ? state.expenses[tracker.id] : undefined;
  const ownerId = state.household.owner_id;

  /* ---------- Load the viewed month's expenses ---------- */
  const loadMonth = useCallback(
    async (t: Tracker) => {
      if (loadingRef.current.has(t.id)) return;
      loadingRef.current.add(t.id);
      const list = await fetchExpenses(sb, t.id);
      loadingRef.current.delete(t.id);
      if (list) dispatch({ type: "setExpenses", trackerId: t.id, expenses: list });
    },
    [sb],
  );
  useEffect(() => {
    if (tracker && !state.expenses[tracker.id]) void loadMonth(tracker);
  }, [tracker, state.expenses, loadMonth]);

  /* ---------- Keep the URL in step with the month ---------- */
  const goMonth = useCallback((k: string) => {
    setMonth(k);
    setFilterCat("all");
    const path = k === currentMonthKey() ? "/tracker" : `/tracker/${k}`;
    if (window.location.pathname !== path) window.history.replaceState(null, "", path);
  }, []);

  /* ---------- Filter resets when its category disappears (PRD §4.4.5) ---------- */
  useEffect(() => {
    if (filterCat !== "all" && !state.categories.some((c) => c.id === filterCat)) setFilterCat("all");
  }, [filterCat, state.categories]);

  /* ---------- Copy hint for the empty month (PRD §6.3.3) ---------- */
  useEffect(() => {
    setCopyHint(null);
    if (!month || tracker) return;
    let alive = true;
    const { y, m } = parseMonthKey(month);
    sb.rpc("get_copy_source", { p_year: y, p_month: m }).then(({ data }) => {
      if (alive && data) setCopyHint(monthLabel(monthKey(data.year, data.month)));
    });
    return () => {
      alive = false;
    };
  }, [month, tracker, sb]);

  /* ---------- Member helpers ---------- */
  const memberIndex = useCallback((id: string) => state.members.findIndex((m) => m.user_id === id), [state.members]);
  const memberName = useCallback(
    (id: string) => state.members.find((m) => m.user_id === id)?.display_name ?? "A former member",
    [state.members],
  );
  const ownerLabel = useCallback((id: string) => (id === me ? "You" : memberName(id)), [me, memberName]);
  const deletedBy = useCallback((id: string) => {
    const who = deletedByRef.current.get(id);
    if (!who) return null;
    return who === me ? "you" : stateRef.current.members.find((m) => m.user_id === who)?.display_name ?? "another member";
  }, [me]);

  const markOwn = (row: { id: string; updated_at: string }) => {
    ownWrites.current.add(`${row.id}|${row.updated_at}`);
    if (ownWrites.current.size > 500) ownWrites.current = new Set(Array.from(ownWrites.current).slice(-200));
  };
  const announceDelete = (table: string, id: string) => {
    deletedByRef.current.set(id, me);
    void channelRef.current?.send({ type: "broadcast", event: "deleted", payload: { table, id, by: me } });
  };

  /* ---------- Full refetch (after reconnecting) ---------- */
  const refreshAll = useCallback(async () => {
    const hid = stateRef.current.household.id;
    const [household, members, categories, trackers] = await Promise.all([
      fetchHousehold(sb, hid),
      fetchMembers(sb, hid),
      fetchCategories(sb, hid),
      fetchTrackers(sb, hid),
    ]);
    if (!household) {
      // No longer readable: the user left this household from another device.
      const { data } = await sb.from("household_members").select("user_id").eq("user_id", me).maybeSingle();
      if (!data) setScreen({ kind: "left", household: stateRef.current.household.name });
      return;
    }
    const keep: Record<string, Expense[]> = {};
    const t = trackerFor(monthRef.current, trackers);
    if (t) {
      const list = await fetchExpenses(sb, t.id);
      if (list) keep[t.id] = list;
    }
    dispatch({ type: "reset", household, members, categories, trackers, keep });
  }, [sb, me, trackerFor]);

  /* ---------- Realtime (PRD §6.6) ---------- */
  useEffect(() => {
    const hid = initial.household.id;
    let disposed = false;
    let dropped = false;
    const isEcho = (row: { id?: string; updated_at?: string }) =>
      !!row.id && !!row.updated_at && ownWrites.current.has(`${row.id}|${row.updated_at}`);
    const refreshMembers = async () => dispatch({ type: "members", members: await fetchMembers(sb, hid) });

    const ch = sb.channel(`household:${hid}`, { config: { broadcast: { self: false }, presence: { key: me } } });
    const filtered = (table: string, column = "household_id") => ({ schema: "public", table, filter: `${column}=eq.${hid}` });

    ch.on("broadcast", { event: "deleted" }, ({ payload }) => {
      if (payload?.id && payload?.by) deletedByRef.current.set(payload.id, payload.by);
    });

    // Expenses
    const onExpense = ({ new: row }: { new: Record<string, unknown> }) => {
      if (row.household_id !== hid || isEcho(row as { id: string; updated_at: string })) return;
      dispatch({ type: "upsertExpense", expense: normalizeExpense(row) });
    };
    ch.on("postgres_changes", { event: "INSERT", ...filtered("expenses") }, onExpense);
    ch.on("postgres_changes", { event: "UPDATE", ...filtered("expenses") }, onExpense);
    // DELETE events can't be filtered; with RLS they carry only the primary key, so match by id.
    ch.on("postgres_changes", { event: "DELETE", schema: "public", table: "expenses" }, ({ old }) => {
      if (old?.id) dispatch({ type: "removeExpense", id: old.id as string });
    });

    // Categories
    const onCategory = ({ new: row }: { new: Record<string, unknown> }) => {
      if (row.household_id !== hid || isEcho(row as { id: string; updated_at: string })) return;
      dispatch({ type: "upsertCategory", category: row as unknown as Category });
    };
    ch.on("postgres_changes", { event: "INSERT", ...filtered("categories") }, onCategory);
    ch.on("postgres_changes", { event: "UPDATE", ...filtered("categories") }, onCategory);
    ch.on("postgres_changes", { event: "DELETE", schema: "public", table: "categories" }, ({ old }) => {
      const id = old?.id as string | undefined;
      if (!id) return;
      const cat = stateRef.current.categories.find((c) => c.id === id);
      if (!cat) return; // Ours (already removed) or another household's.
      dispatch({ type: "removeCategory", id });
      const who = deletedByRef.current.get(id);
      const name = who ? stateRef.current.members.find((m) => m.user_id === who)?.display_name : null;
      toast(`${cat.name} was deleted by ${name ?? "another member"}`);
    });

    // Trackers
    ch.on("postgres_changes", { event: "INSERT", ...filtered("trackers") }, ({ new: row }) => {
      dispatch({ type: "upsertTracker", tracker: row as unknown as Tracker });
    });
    // Tracker deleted by another member (its expenses cascade; their DELETE events are no-ops after this).
    ch.on("postgres_changes", { event: "DELETE", schema: "public", table: "trackers" }, ({ old }) => {
      const id = old?.id as string | undefined;
      const t = id ? stateRef.current.trackers.find((x) => x.id === id) : undefined;
      if (!t) return; // Ours (already removed) or another household's.
      const label = monthLabel(monthKey(t.year, t.month));
      const viewing = trackerFor(monthRef.current)?.id === t.id;
      // Close dialogs about this month's data so they don't each toast separately.
      if (viewing) setDialog((d) => (d && (d.kind === "expense" || d.kind === "deleteExpense" || d.kind === "deleteTracker") ? null : d));
      dispatch({ type: "removeTracker", id: t.id });
      const who = deletedByRef.current.get(t.id);
      const name = who ? stateRef.current.members.find((m) => m.user_id === who)?.display_name : null;
      toast(`The ${label} tracker was deleted by ${name ?? "another member"}`);
    });

    // Household
    ch.on("postgres_changes", { event: "UPDATE", ...filtered("households", "id") }, ({ new: row }) => {
      const h = row as unknown as Household;
      dispatch({ type: "household", patch: { name: h.name, code: h.code, owner_id: h.owner_id, updated_at: h.updated_at } });
    });

    // Members
    ch.on("postgres_changes", { event: "INSERT", ...filtered("household_members") }, () => void refreshMembers());
    ch.on("postgres_changes", { event: "UPDATE", ...filtered("household_members") }, () => void refreshMembers());
    ch.on("postgres_changes", { event: "DELETE", schema: "public", table: "household_members" }, ({ old }) => {
      const uid = old?.user_id as string | undefined;
      if (!uid) return;
      if (uid === me) {
        setDialog(null);
        setScreen({ kind: "left", household: stateRef.current.household.name });
        return;
      }
      if (stateRef.current.members.some((m) => m.user_id === uid)) {
        dispatch({ type: "removeMember", userId: uid });
        void refreshMembers();
      }
    });

    // Presence: who has the tracker open (optional in the PRD).
    ch.on("presence", { event: "sync" }, () => {
      setOnline(new Set(Object.keys(ch.presenceState())));
    });

    ch.subscribe((status) => {
      if (disposed) return;
      if (status === "SUBSCRIBED") {
        setConnected(true);
        void ch.track({ user_id: me, at: new Date().toISOString() });
        if (dropped) {
          dropped = false;
          void refreshAll();
        }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        dropped = true;
        setConnected(false);
      }
    });
    channelRef.current = ch;

    return () => {
      disposed = true;
      channelRef.current = null;
      void sb.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Operations ---------- */
  const ops: Ops = useMemo(
    () => ({
      async renameHousehold(name) {
        const prev = stateRef.current.household;
        if (name === prev.name) return null;
        dispatch({ type: "household", patch: { name } });
        const { data, error } = await sb.from("households").update({ name }).eq("id", prev.id).select("id, name, code, owner_id, updated_at");
        if (error || !data?.length) {
          dispatch({ type: "household", patch: { name: prev.name } });
          return errorMessage(error, "Couldn't rename the household. Try again.");
        }
        dispatch({ type: "household", patch: data[0] as Household });
        toast(`Renamed to ${name}`);
        return null;
      },

      async resetCode() {
        const { data, error } = await sb.rpc("reset_household_code");
        if (error) return errorMessage(error);
        dispatch({ type: "household", patch: { code: data as string } });
        toast("Household code reset");
        return null;
      },

      async ownedExpenseCount() {
        const { count } = await sb
          .from("expenses")
          .select("id", { count: "exact", head: true })
          .eq("household_id", stateRef.current.household.id)
          .eq("owner_id", me);
        return count ?? 0;
      },

      async leave() {
        const name = stateRef.current.household.name;
        const { error } = await sb.rpc("leave_household");
        if (error) return errorMessage(error);
        if (channelRef.current) await sb.removeChannel(channelRef.current);
        channelRef.current = null;
        setDialog(null);
        setScreen({ kind: "left", household: name });
        window.scrollTo(0, 0);
        return null;
      },

      async signOut() {
        if (channelRef.current) await sb.removeChannel(channelRef.current);
        channelRef.current = null;
        await sb.auth.signOut();
        window.location.assign("/signed-out");
      },

      async saveCategory({ name, color }, original) {
        const dup = stateRef.current.categories.some(
          (c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== original?.id,
        );
        const dupMsg = `"${name}" already exists. Pick a different name.`;
        if (dup) return dupMsg;

        if (original) {
          const optimistic = { ...original, name, color };
          dispatch({ type: "upsertCategory", category: optimistic });
          const { data, error } = await sb
            .from("categories")
            .update({ name, color })
            .eq("id", original.id)
            .eq("updated_at", original.updated_at)
            .select("id, household_id, name, color, updated_by, created_at, updated_at");
          if (error || !data?.length) {
            const { data: latest } = await sb.from("categories").select("*").eq("id", original.id).maybeSingle();
            if (latest) dispatch({ type: "upsertCategory", category: latest as Category });
            else dispatch({ type: "removeCategory", id: original.id });
            if (errorCode(error) === "UNIQUE") return dupMsg;
            return error ? errorMessage(error) : CATEGORY_CONFLICT_MSG;
          }
          markOwn(data[0] as Category);
          dispatch({ type: "upsertCategory", category: data[0] as Category });
          toast(name === original.name ? `Updated ${name}` : `Renamed ${original.name} to ${name}`);
          return null;
        }

        const now = new Date().toISOString();
        const row: Category = {
          id: crypto.randomUUID(),
          household_id: stateRef.current.household.id,
          name,
          color,
          updated_by: me,
          created_at: now,
          updated_at: now,
        };
        dispatch({ type: "upsertCategory", category: row });
        const { data, error } = await sb
          .from("categories")
          .insert({ id: row.id, household_id: row.household_id, name, color })
          .select("id, household_id, name, color, updated_by, created_at, updated_at")
          .single();
        if (error) {
          dispatch({ type: "removeCategory", id: row.id });
          return errorCode(error) === "UNIQUE" ? dupMsg : errorMessage(error);
        }
        markOwn(data as Category);
        dispatch({ type: "upsertCategory", category: data as Category });
        toast(`Added ${name}`);
        return null;
      },

      async categoryImpact(id) {
        const { data, error } = await sb.rpc("category_delete_impact", { p_category_id: id });
        if (error || !data) return null;
        return {
          expense_count: Number(data.expense_count),
          month_count: Number(data.month_count),
          budgeted_cents: Number(data.budgeted_cents),
          actual_cents: Number(data.actual_cents),
        };
      },

      async deleteCategory(cat, impact) {
        announceDelete("categories", cat.id);
        dispatch({ type: "removeCategory", id: cat.id });
        const { error } = await sb.from("categories").delete().eq("id", cat.id);
        if (error) {
          deletedByRef.current.delete(cat.id);
          await refreshAll();
          return errorMessage(error, "Couldn't delete the category. Try again.");
        }
        const n = impact?.expense_count ?? 0;
        toast(n ? `Deleted ${cat.name} and ${plural(n, "expense")}` : `Deleted ${cat.name}`);
        return null;
      },

      async saveExpense(input, original) {
        const t = trackerFor(monthRef.current);
        if (!t) return "This month's tracker no longer exists.";
        if (original) {
          dispatch({ type: "upsertExpense", expense: { ...original, ...input }, force: true });
          const { data, error } = await sb
            .from("expenses")
            .update(input)
            .eq("id", original.id)
            .eq("updated_at", original.updated_at)
            .select(EXPENSE_COLUMNS);
          if (error || !data?.length) {
            const { data: latest } = await sb.from("expenses").select(EXPENSE_COLUMNS).eq("id", original.id).maybeSingle();
            if (latest) dispatch({ type: "upsertExpense", expense: normalizeExpense(latest), force: true });
            else dispatch({ type: "removeExpense", id: original.id });
            return error ? errorMessage(error) : CONFLICT_MSG;
          }
          const saved = normalizeExpense(data[0]);
          markOwn(saved);
          dispatch({ type: "upsertExpense", expense: saved, force: true });
          toast(`Saved ${input.name}`);
          return null;
        }

        const now = new Date().toISOString();
        const row: Expense = {
          id: crypto.randomUUID(),
          household_id: stateRef.current.household.id,
          tracker_id: t.id,
          ...input,
          created_by: me,
          updated_by: me,
          created_at: now,
          updated_at: now,
        };
        dispatch({ type: "upsertExpense", expense: row, force: true });
        const { data, error } = await sb
          .from("expenses")
          .insert({ id: row.id, household_id: row.household_id, tracker_id: row.tracker_id, ...input })
          .select(EXPENSE_COLUMNS)
          .single();
        if (error) {
          dispatch({ type: "removeExpense", id: row.id });
          return errorMessage(error, "Couldn't add the expense. Try again.");
        }
        const saved = normalizeExpense(data);
        markOwn(saved);
        dispatch({ type: "upsertExpense", expense: saved, force: true });
        toast(`Added ${input.name}`);
        return null;
      },

      async deleteExpense(expense) {
        announceDelete("expenses", expense.id);
        dispatch({ type: "removeExpense", id: expense.id });
        const { error } = await sb.from("expenses").delete().eq("id", expense.id);
        if (error) {
          deletedByRef.current.delete(expense.id);
          dispatch({ type: "upsertExpense", expense, force: true });
          return errorMessage(error, "Couldn't delete the expense. Try again.");
        }
        toast(`Deleted ${expense.name}`);
        return null;
      },

      async startCreateTracker() {
        const k = monthRef.current;
        if (!k) return;
        const { y, m } = parseMonthKey(k);
        const { data, error } = await sb.rpc("get_copy_source", { p_year: y, p_month: m });
        if (error) {
          toast(errorMessage(error));
          return;
        }
        const source = data as CopySource | null;
        if (source && source.categories?.length) setDialog({ kind: "copy", source });
        else {
          const err = await ops.createTracker([], false);
          if (err) toast(err);
        }
      },

      async deleteTracker(t) {
        const label = monthLabel(monthKey(t.year, t.month));
        const cached = stateRef.current.expenses[t.id];
        announceDelete("trackers", t.id);
        dispatch({ type: "removeTracker", id: t.id });
        const { data, error } = await sb.rpc("delete_tracker", { p_tracker_id: t.id });
        if (error) {
          deletedByRef.current.delete(t.id);
          if (errorCode(error) === "TRACKER_NOT_FOUND") return null; // Someone else already deleted it.
          dispatch({ type: "upsertTracker", tracker: t });
          if (cached) dispatch({ type: "setExpenses", trackerId: t.id, expenses: cached });
          return errorMessage(error, "Couldn't delete the tracker. Try again.");
        }
        const n = Number(data?.expense_count ?? 0);
        toast(n ? `Deleted the ${label} tracker and ${plural(n, "expense")}` : `Deleted the ${label} tracker`);
        return null;
      },

      async createTracker(ids, includeActual) {
        const k = monthRef.current;
        if (!k) return null;
        const { y, m } = parseMonthKey(k);
        const { data, error } = await sb.rpc("create_tracker", {
          p_year: y,
          p_month: m,
          p_copy_expense_ids: ids,
          p_include_actual: includeActual,
        });
        if (error) return errorMessage(error, "Couldn't create the tracker. Try again.");
        const t = data.tracker as Tracker;
        dispatch({ type: "upsertTracker", tracker: t });
        const list = await fetchExpenses(sb, t.id);
        if (list) dispatch({ type: "setExpenses", trackerId: t.id, expenses: list });
        const label = monthLabel(k);
        if (!data.created) toast(`${label} was already created by another member`);
        else if (data.copied) toast(`Created ${label} with ${plural(data.copied, "copied expense")}`);
        else toast(`Created ${label} tracker`);
        return null;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sb, me, toast, refreshAll, trackerFor],
  );

  const ctx: TrackerCtx | null = month
    ? {
        state,
        me,
        month,
        tracker,
        expenses,
        ownerId,
        online,
        connected,
        copyHint,
        ops,
        memberIndex,
        memberName,
        ownerLabel,
        deletedBy,
        open: setDialog,
        close: () => setDialog(null),
        toast,
        goMonth,
        filterCat,
        setFilterCat,
        sort,
        setSort,
        view,
        setView,
        split,
        setSplit,
        rows,
        setRows,
      }
    : null;

  if (screen.kind === "left") {
    return (
      <div className="wrap pg-tracker">
        <section className="left-card">
          <span className="eyebrow">Left household</span>
          <h2>You left {screen.household}</h2>
          <p>You no longer have access to its monthly trackers. Start your own household, or join another one with a household code.</p>
          <div className="code-actions">
            <a className="btn primary" href="/onboarding">Create a household</a>
            <a className="btn" href="/onboarding?mode=join">Join with a code</a>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="wrap pg-tracker" aria-busy="true">
        <div className="skeleton" style={{ minHeight: 72 }} />
        <div className="skeleton" style={{ minHeight: 88 }} />
        <div className="skeleton" style={{ minHeight: 320 }} />
      </div>
    );
  }

  return (
    <Ctx.Provider value={ctx}>
      <div className="wrap pg-tracker">
        <Header />
        {rows.map((row) => {
          if (row === "month") return <MonthRail key={row} />;
          // Without a tracker, the empty-month card takes the place of the first data row.
          if (!tracker) return row === rows.find((r) => r !== "month") ? <EmptyMonth key="empty" /> : null;
          if (!expenses) return <div key={row} className="skeleton" style={{ minHeight: row === "totals" ? 110 : 320 }} />;
          if (row === "totals") return <Kpis key={row} />;
          if (row === "summary") return <ChartSummary key={row} />;
          return <ExpensesSection key={row} />;
        })}
        <Footer />
      </div>
      {dialog && <Dialogs dialog={dialog} />}
    </Ctx.Provider>
  );
}
