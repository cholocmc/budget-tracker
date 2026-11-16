"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CategoryBars,
  ChartSwitch,
  isChartKind,
  NestedPie,
  StatusBreakdown,
  TrendChart,
  type ChartKind,
  type MonthTotals,
} from "@/components/BudgetCharts";
import { monthKey, statusOf } from "@/lib/format";
import { getSupabase } from "@/lib/supabase/client";
import type { Category } from "@/lib/types";
import { useTracker } from "./context";

/* ---------- Summary math (shared by the KPIs, the charts, and the Category summary) ---------- */
export type SummaryRow = { cat: Category; count: number; alloc: number; budget: number; actual: number; remaining: number };
export function useSummary() {
  const { state, expenses } = useTracker();
  return useMemo(() => {
    const list = expenses ?? [];
    const rows: SummaryRow[] = state.categories.map((c) => {
      const ex = list.filter((x) => x.category_id === c.id);
      const budget = ex.reduce((s, x) => s + x.budgeted_cents, 0);
      const actual = ex.reduce((s, x) => s + x.actual_cents, 0);
      return { cat: c, count: ex.length, alloc: c.allocated_cents, budget, actual, remaining: budget - actual };
    });
    const alloc = rows.reduce((s, r) => s + r.alloc, 0);
    const budget = rows.reduce((s, r) => s + r.budget, 0);
    const actual = rows.reduce((s, r) => s + r.actual, 0);
    return { rows, tot: { alloc, budget, actual, remaining: budget - actual, count: list.length } };
  }, [state.categories, expenses]);
}

/* ---------- Chart card with a view switcher (PRD §6.3.5) ---------- */
const CHART_KEY = "finance-tracker-chart";

export function ChartPanel() {
  const { expenses } = useTracker();
  const { rows } = useSummary();
  const [kind, setKind] = useState<ChartKind>("pie");
  useEffect(() => {
    try {
      const v = localStorage.getItem(CHART_KEY);
      if (isChartKind(v)) setKind(v);
    } catch {}
  }, []);
  const pick = (k: ChartKind) => {
    setKind(k);
    try {
      localStorage.setItem(CHART_KEY, k);
    } catch {}
  };
  const items = useMemo(
    () => (expenses ?? []).map((x) => ({ status: statusOf(x)[0], budget: x.budgeted_cents, actual: x.actual_cents })),
    [expenses],
  );

  let body;
  if (kind === "trend") body = <TrackerTrend />;
  else if (!rows.length) body = <Empty text="The chart appears once you add categories and expenses." />;
  else if (kind === "pie") body = <NestedPie rows={rows} />;
  else if (kind === "bars") body = <CategoryBars rows={rows} />;
  else if (!items.length) body = <Empty text="No expenses this month yet. Add some to see what's paid and what's still due." />;
  else body = <StatusBreakdown items={items} />;

  return (
    <div className="panel chart-panel">
      <div className="panel-head">
        <h2>Budget vs actual</h2>
        <ChartSwitch kind={kind} onPick={pick} />
      </div>
      {body}
    </div>
  );
}

function Empty({ text, busy }: { text: string; busy?: boolean }) {
  return (
    <div className="empty" aria-busy={busy || undefined}>
      <p>{text}</p>
    </div>
  );
}

/* ---------- Trend data: the last six trackers up to the viewed month ---------- */
const TREND_MONTHS = 6;
type Totals = { budget: number; actual: number };

function TrackerTrend() {
  const { state, month, tracker, expenses } = useTracker();
  const past = useMemo(
    () => state.trackers.filter((t) => monthKey(t.year, t.month) <= month).slice(-TREND_MONTHS),
    [state.trackers, month],
  );
  // Past months are fetched when the view opens; the viewed month uses the live expenses.
  const othersKey = past
    .filter((t) => t.id !== tracker?.id)
    .map((t) => t.id)
    .join(",");
  const [fetched, setFetched] = useState<{ key: string; totals?: Record<string, Totals>; error?: true } | null>(null);

  useEffect(() => {
    if (!othersKey) return;
    let live = true;
    const ids = othersKey.split(",");
    void getSupabase()
      .from("expenses")
      .select("tracker_id, budgeted_cents, actual_cents")
      .eq("household_id", state.household.id)
      .in("tracker_id", ids)
      .then(({ data, error }) => {
        if (!live) return;
        if (error) return setFetched({ key: othersKey, error: true });
        const totals: Record<string, Totals> = {};
        for (const id of ids) totals[id] = { budget: 0, actual: 0 };
        for (const row of data ?? []) {
          const t = totals[row.tracker_id as string];
          if (!t) continue;
          t.budget += Number(row.budgeted_cents) || 0;
          t.actual += Number(row.actual_cents) || 0;
        }
        setFetched({ key: othersKey, totals });
      });
    return () => {
      live = false;
    };
  }, [othersKey, state.household.id]);

  if (othersKey && fetched?.key !== othersKey) return <Empty text="Loading past months…" busy />;
  if (othersKey && fetched?.error) return <Empty text="Couldn't load past months. Check your connection and try again." />;

  const totals = fetched?.totals ?? {};
  const live = (expenses ?? []).reduce((s, x) => ({ budget: s.budget + x.budgeted_cents, actual: s.actual + x.actual_cents }), { budget: 0, actual: 0 });
  const data: MonthTotals[] = past.map((t) => ({
    key: monthKey(t.year, t.month),
    ...(t.id === tracker?.id ? live : (totals[t.id] ?? { budget: 0, actual: 0 })),
  }));
  return (
    <>
      <TrendChart data={data} current={month} />
      {data.length < 2 && <p className="chart-note">The trend fills in as your household tracks more months.</p>}
    </>
  );
}
