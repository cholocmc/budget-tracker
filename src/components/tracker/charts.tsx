"use client";

import { useEffect, useMemo, useState } from "react";
import { arcPath } from "@/lib/chart";
import { fmtCents, monthKey, monthLabel, parseMonthKey, MONTHS, plural, statusOf, type StatusKey } from "@/lib/format";
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

const pctOf = (v: number, total: number) => (total ? ((v / total) * 100).toFixed(1) : "0.0");

/* ---------- Chart card with a view switcher (PRD §6.3.5) ---------- */
export type ChartKind = "pie" | "bars" | "status" | "trend";
const CHART_KEY = "finance-tracker-chart";
const CHARTS: { id: ChartKind; label: string; title: string }[] = [
  { id: "pie", label: "Pie", title: "Share of budgeted and actual by category" },
  { id: "bars", label: "Bars", title: "Budgeted, actual, and allocation for each category" },
  { id: "status", label: "Status", title: "This month's expenses by payment status" },
  { id: "trend", label: "Trend", title: "Budgeted and actual over recent months" },
];
const isChartKind = (v: unknown): v is ChartKind => CHARTS.some((c) => c.id === v);

export function ChartPanel() {
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
  return (
    <div className="panel chart-panel">
      <div className="panel-head">
        <h2>Budget vs actual</h2>
        <div className="seg chart-seg" role="group" aria-label="Chart type">
          {CHARTS.map((c) => (
            <button key={c.id} type="button" aria-pressed={kind === c.id} title={c.title} onClick={() => pick(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      {kind === "pie" && <NestedPie />}
      {kind === "bars" && <CategoryBars />}
      {kind === "status" && <StatusBreakdown />}
      {kind === "trend" && <MonthTrend />}
    </div>
  );
}

function NoCategories() {
  return (
    <div className="empty">
      <p>The chart appears once you add categories and expenses.</p>
    </div>
  );
}

/** Hover, focus, and tap all highlight the same item. */
const hl = (id: string, set: (v: string | null) => void) => ({
  onMouseEnter: () => set(id),
  onMouseLeave: () => set(null),
  onFocus: () => set(id),
  onBlur: () => set(null),
  onClick: () => set(id),
});

/* ---------- Pie: outer ring budgeted, inner pie actual ---------- */
function NestedPie() {
  const { rows, tot } = useSummary();
  const [active, setActive] = useState<string | null>(null);
  if (!rows.length) return <NoCategories />;
  const ring = (key: "budget" | "actual", total: number, rO: number, rI: number, label: string) => {
    if (!total) {
      return (
        <circle cx="120" cy="120" r={rI ? (rO + rI) / 2 : rO / 2} fill="none" stroke="var(--line-strong)" strokeWidth={rI ? rO - rI : rO} strokeDasharray="3 5" />
      );
    }
    let a = 0;
    return rows
      .filter((r) => r[key] > 0)
      .map((r) => {
        const span = (r[key] / total) * Math.PI * 2;
        const d = arcPath(120, 120, rO, rI, a, a + span);
        a += span;
        return (
          <path
            key={`${key}-${r.cat.id}`}
            className={`slice${active === r.cat.id ? " on" : ""}`}
            d={d}
            fill={r.cat.color}
            tabIndex={0}
            aria-label={`${r.cat.name} ${label}: ${fmtCents(r[key])}`}
            {...hl(r.cat.id, setActive)}
          />
        );
      });
  };
  const r = rows.find((x) => x.cat.id === active);
  return (
    <div className={`chart-wrap${active ? " hovering" : ""}`}>
      <svg viewBox="0 0 240 240" role="img" aria-label="Budgeted by category in the outer ring, actual by category in the inner pie">
        {ring("budget", tot.budget, 116, 86, "budgeted")}
        {ring("actual", tot.actual, 76, 0, "actual")}
      </svg>
      <div className="chart-key">
        <div className="key-legend">
          <span><i className="ring-ico" />Outer ring: budgeted</span>
          <span>·</span>
          <span><i className="pie-ico" />Inner pie: actual</span>
        </div>
        {/* Readout sits above the legend so it stays in view when there are many categories. */}
        <div className="readout" aria-live="polite">
          {r ? (
            <>
              <b className="ro-name">{r.cat.name}</b>
              <span className="ro-line">
                Budgeted <b className="mono">{fmtCents(r.budget)}</b> ({pctOf(r.budget, tot.budget)}%)
              </span>
              <span className="ro-line">
                Actual <b className="mono">{fmtCents(r.actual)}</b> ({pctOf(r.actual, tot.actual)}%)
              </span>
            </>
          ) : (
            "Hover or tap a slice or category to see its amounts."
          )}
        </div>
        <ul className="legend">
          {rows.map((row) => (
            <li key={row.cat.id} className={active === row.cat.id ? "on" : ""} tabIndex={0} {...hl(row.cat.id, setActive)}>
              <span className="sw" style={{ background: row.cat.color }} />
              <span className="nm">{row.cat.name}</span>
              <span className="pcs">
                <span>Budget <b>{pctOf(row.budget, tot.budget)}%</b></span>
                <span>Actual <b>{pctOf(row.actual, tot.actual)}%</b></span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------- Bars: one bullet bar per category on a shared scale ---------- */
function CategoryBars() {
  const { rows } = useSummary();
  const [active, setActive] = useState<string | null>(null);
  if (!rows.length) return <NoCategories />;
  const max = Math.max(1, ...rows.map((r) => Math.max(r.budget, r.actual, r.alloc)));
  const w = (v: number) => `${(v / max) * 100}%`;
  return (
    <div className={`cbars${active ? " hovering" : ""}`}>
      <div className="key-legend">
        <span><i className="key-sw soft" />Budgeted</span>
        <span><i className="key-sw" />Actual</span>
        <span><i className="key-tick" />Allocated</span>
      </div>
      <ul className="cb-list">
        {rows.map((r) => {
          const over = r.actual > r.budget;
          return (
            <li
              key={r.cat.id}
              className={`cb-row${active === r.cat.id ? " on" : ""}`}
              tabIndex={0}
              aria-label={`${r.cat.name}: actual ${fmtCents(r.actual)} of ${fmtCents(r.budget)} budgeted${r.alloc ? `, ${fmtCents(r.alloc)} allocated` : ""}`}
              {...hl(r.cat.id, setActive)}
            >
              <div className="cb-top">
                <span className="sw" style={{ background: r.cat.color }} />
                <span className="nm">{r.cat.name}</span>
                <span className="cb-amt">
                  {fmtCents(r.actual)} <small>of {fmtCents(r.budget)}</small>
                </span>
              </div>
              <div className="cb-track" aria-hidden="true">
                <i className="cb-budget" style={{ width: w(r.budget), background: r.cat.color }} />
                <i className="cb-actual" style={{ width: w(r.actual), background: r.cat.color }} />
                {r.alloc > 0 && <i className="cb-alloc" style={{ left: w(r.alloc) }} />}
              </div>
              <div className="cb-foot">
                <span className={over ? "neg" : undefined}>
                  {over ? `Over by ${fmtCents(r.actual - r.budget)}` : `${fmtCents(r.budget - r.actual)} left`}
                </span>
                {r.alloc > 0 && (
                  <span className={r.budget > r.alloc ? "neg" : undefined}>
                    {r.budget > r.alloc ? `${fmtCents(r.budget - r.alloc)} over allocation` : `Allocated ${fmtCents(r.alloc)}`}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- Status: this month's expenses by derived status (PRD §4.5) ---------- */
const STATUS_ORDER: { key: StatusKey; label: string }[] = [
  { key: "over", label: "Over budget" },
  { key: "overdue", label: "Overdue" },
  { key: "partial", label: "Partly paid" },
  { key: "upcoming", label: "Upcoming" },
  { key: "settled", label: "Settled" },
];

function StatusBreakdown() {
  const { expenses } = useTracker();
  const list = useMemo(() => expenses ?? [], [expenses]);
  const groups = useMemo(() => {
    const g = new Map<StatusKey, { count: number; budget: number; actual: number }>();
    for (const x of list) {
      const k = statusOf(x)[0];
      const v = g.get(k) ?? { count: 0, budget: 0, actual: 0 };
      v.count += 1;
      v.budget += x.budgeted_cents;
      v.actual += x.actual_cents;
      g.set(k, v);
    }
    return g;
  }, [list]);
  if (!list.length) {
    return (
      <div className="empty">
        <p>No expenses this month yet. Add some to see what's paid and what's still due.</p>
      </div>
    );
  }
  const totBudget = list.reduce((s, x) => s + x.budgeted_cents, 0);
  const leftToPay = list.reduce((s, x) => s + Math.max(0, x.budgeted_cents - x.actual_cents), 0);
  const settled = groups.get("settled")?.count ?? 0;
  const overdue = groups.get("overdue");
  // Bars show each status's share of the month's budgeted total, or of the expense count when nothing is budgeted.
  const share = (v: { count: number; budget: number }) => (totBudget ? v.budget / totBudget : v.count / list.length) * 100;
  const detail = (k: StatusKey, v: { budget: number; actual: number }) => {
    switch (k) {
      case "settled":
        return `${fmtCents(v.actual)} paid`;
      case "partial":
        return `${fmtCents(v.actual)} of ${fmtCents(v.budget)} paid`;
      case "over":
        return `Over by ${fmtCents(v.actual - v.budget)}`;
      default:
        return `${fmtCents(v.budget)} due`;
    }
  };
  return (
    <div className="status-chart">
      <div className="st-head">
        <div>
          <span className="eyebrow">Left to pay</span>
          <b className="mono">{fmtCents(leftToPay)}</b>
        </div>
        <div>
          <span className="eyebrow">Settled</span>
          <b className="mono">
            {settled} of {list.length}
          </b>
        </div>
        {overdue && (
          <div className="neg">
            <span className="eyebrow">Overdue</span>
            <b className="mono">{fmtCents(overdue.budget - overdue.actual)}</b>
          </div>
        )}
      </div>
      <ul className="st-list">
        {STATUS_ORDER.map(({ key, label }) => {
          const v = groups.get(key);
          if (!v) return null;
          return (
            <li key={key} className={`st-row st-${key}`}>
              <div className="st-top">
                <span className={`pill ${key}`}>{label}</span>
                <span className="st-cnt">{plural(v.count, "expense")}</span>
                <span className="st-amt">{detail(key, v)}</span>
              </div>
              <div className="st-track" aria-hidden="true">
                <i style={{ width: `${Math.max(share(v), 1.5)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="chart-note">Bar length is each status's share of the month's budgeted total.</p>
    </div>
  );
}

/* ---------- Trend: budgeted vs actual totals for the last six trackers up to this month ---------- */
const TREND_MONTHS = 6;
const compact = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 1 });
const fmtCompact = (cents: number) => compact.format(cents / 100);

/** A round axis step (1, 2, 2.5, or 5 × 10ⁿ) so three or four gridlines cover the max. */
function niceStep(max: number) {
  const raw = max / 3;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

/** A column with rounded top corners, anchored to the baseline. */
function colPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

type MonthTotals = { budget: number; actual: number };

function MonthTrend() {
  const { state, month, tracker, expenses } = useTracker();
  const [active, setActive] = useState<string | null>(null);
  const past = useMemo(
    () => state.trackers.filter((t) => monthKey(t.year, t.month) <= month).slice(-TREND_MONTHS),
    [state.trackers, month],
  );
  const others = past.filter((t) => t.id !== tracker?.id).map((t) => t.id);
  const othersKey = others.join(",");
  const [fetched, setFetched] = useState<{ key: string; totals: Record<string, MonthTotals> } | { key: string; error: true } | null>(null);

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
        const totals: Record<string, MonthTotals> = {};
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

  const ready = !othersKey || fetched?.key === othersKey;
  if (othersKey && fetched?.key === othersKey && "error" in fetched) {
    return (
      <div className="empty">
        <p>Couldn't load past months. Check your connection and try again.</p>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="empty" aria-busy="true">
        <p>Loading past months…</p>
      </div>
    );
  }

  const totalsById = fetched && "totals" in fetched ? fetched.totals : {};
  const live = (expenses ?? []).reduce((s, x) => ({ budget: s.budget + x.budgeted_cents, actual: s.actual + x.actual_cents }), { budget: 0, actual: 0 });
  const data = past.map((t) => {
    const key = monthKey(t.year, t.month);
    const v = t.id === tracker?.id ? live : (totalsById[t.id] ?? { budget: 0, actual: 0 });
    return { key, ...v };
  });

  // Geometry (SVG user units; the SVG scales to the card's width).
  const W = 360;
  const H = 190;
  const L = 48;
  const R = 6;
  const T = 10;
  const B = 34;
  const plotW = W - L - R;
  const plotH = H - T - B;
  const peak = Math.max(1, ...data.map((d) => Math.max(d.budget, d.actual)));
  const step = niceStep(peak);
  const top = Math.ceil(peak / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const y = (v: number) => T + plotH - (v / top) * plotH;
  const slot = plotW / Math.max(data.length, 1);
  const bw = Math.min(20, slot * 0.3);

  const shown = data.find((d) => d.key === active) ?? data.find((d) => d.key === month) ?? data[data.length - 1];
  const over = shown && shown.actual > shown.budget;

  return (
    <div className={`trend${active ? " hovering" : ""}`}>
      <div className="key-legend">
        <span><i className="key-sw budget" />Budgeted</span>
        <span><i className="key-sw" />Actual</span>
        <span><i className="key-sw over" />Actual over budget</span>
      </div>
      <div className="readout trend-readout" aria-live="polite">
        {shown && (
          <>
            <b className="ro-name">{monthLabel(shown.key)}</b>
            <span className="ro-line">
              Budgeted <b className="mono">{fmtCents(shown.budget)}</b>
            </span>
            <span className="ro-line">
              Actual <b className="mono">{fmtCents(shown.actual)}</b>{" "}
              {shown.budget > 0 && (
                <span className={over ? "neg" : undefined}>
                  ({over ? `over by ${fmtCents(shown.actual - shown.budget)}` : `${pctOf(shown.actual, shown.budget)}% used`})
                </span>
              )}
            </span>
          </>
        )}
      </div>
      <svg className="trend-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Budgeted and actual totals for ${plural(data.length, "month")}`}>
        {ticks.map((v) => (
          <g key={v}>
            <line className="grid-line" x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
            <text className="axis-lbl" x={L - 6} y={y(v)} dy="0.32em" textAnchor="end">
              {fmtCompact(v)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = L + slot * i + slot / 2;
          const { y: yr, m } = parseMonthKey(d.key);
          const prevYear = i > 0 ? parseMonthKey(data[i - 1].key).y : null;
          const isOver = d.actual > d.budget;
          return (
            <g
              key={d.key}
              className={`tr-col${active === d.key ? " on" : ""}${d.key === month ? " current" : ""}`}
              tabIndex={0}
              aria-label={`${monthLabel(d.key)}: budgeted ${fmtCents(d.budget)}, actual ${fmtCents(d.actual)}`}
              {...hl(d.key, setActive)}
            >
              <rect className="hit" x={cx - slot / 2} y={T} width={slot} height={plotH + B} />
              <path className="tr-budget" d={colPath(cx - bw - 1, y(d.budget), bw, y(0) - y(d.budget))} />
              <path className={`tr-actual${isOver ? " over" : ""}`} d={colPath(cx + 1, y(d.actual), bw, y(0) - y(d.actual))} />
              <text className="axis-lbl month" x={cx} y={H - B + 15} textAnchor="middle">
                {MONTHS[m - 1].slice(0, 3)}
              </text>
              {(i === 0 || prevYear !== yr) && (
                <text className="axis-lbl" x={cx} y={H - B + 28} textAnchor="middle">
                  {yr}
                </text>
              )}
            </g>
          );
        })}
        <line className="base-line" x1={L} x2={W - R} y1={y(0)} y2={y(0)} />
      </svg>
      {data.length < 2 && <p className="chart-note">The trend fills in as your household tracks more months.</p>}
    </div>
  );
}
