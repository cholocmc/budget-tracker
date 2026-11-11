"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  IconEdit,
  IconLeft,
  IconList,
  IconLogout,
  IconPlus,
  IconRight,
  IconTable,
  IconTrash,
  IconUserPlus,
  LogoMark,
} from "@/components/Icons";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { arcPath } from "@/lib/chart";
import {
  fmtCents,
  fmtDue,
  initials,
  isMonthKey,
  memberColor,
  monthKey,
  monthLabel,
  monthShort,
  plural,
  shiftMonthKey,
  statusOf,
} from "@/lib/format";
import type { Category, Expense } from "@/lib/types";
import { useTracker, type SortKey } from "./context";
import { SPLIT_DEFAULT, SPLIT_MAX, SPLIT_MIN } from "./context";

/* ---------- Header (PRD §6.3.1) ---------- */
export function Header() {
  const { state, me, open, ops, memberIndex, online, connected } = useTracker();
  const ms = state.members;
  return (
    <header className="top">
      <div className="brand">
        <LogoMark />
        <div style={{ minWidth: 0 }}>
          <div className="name-row">
            <h1>{state.household.name}</h1>
            <button type="button" className="icon-btn" aria-label="Rename household" title="Rename household" onClick={() => open({ kind: "rename" })}>
              <IconEdit />
            </button>
          </div>
          <div className="sub">
            <span>Budget tracker · {plural(ms.length, "member")}</span>
            {!connected && <span className="sync-pill" role="status">Reconnecting…</span>}
          </div>
        </div>
      </div>
      <div className="members">
        <button
          type="button"
          className="avatars avatars-btn"
          aria-label="Household members"
          title={ms.map((m) => (m.user_id === me ? "You" : m.display_name)).join(", ")}
          onClick={() => open({ kind: "members" })}
        >
          {ms.map((m) => (
            <span key={m.user_id} className="av" style={{ background: memberColor(memberIndex(m.user_id)) }}>
              {initials(m.display_name)}
              {online.has(m.user_id) && m.user_id !== me && <span className="online" aria-hidden="true" />}
            </span>
          ))}
        </button>
        <button type="button" className="btn" aria-label="Invite members" onClick={() => open({ kind: "invite" })}>
          <IconUserPlus />
          <span className="lbl">Invite</span>
        </button>
        <ThemeSwitch />
        <button type="button" className="btn ghost signout" aria-label="Sign out" title="Sign out" onClick={() => void ops.signOut()}>
          <IconLogout />
          <span className="lbl">Sign out</span>
        </button>
      </div>
    </header>
  );
}

/* ---------- Month rail (PRD §6.3.2) ---------- */
export function MonthRail() {
  const { state, month, goMonth, tracker, expenses, open } = useTracker();
  const keys = state.trackers.map((t) => monthKey(t.year, t.month));
  const hasCats = state.categories.length > 0;
  return (
    <section className="rail" aria-label="Month">
      <div className="month-nav">
        <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => goMonth(shiftMonthKey(month, -1))}>
          <IconLeft />
        </button>
        <div className="month-label" aria-live="polite">
          <small>Monthly tracker</small>
          {monthLabel(month)}
        </div>
        <button type="button" className="icon-btn" aria-label="Next month" onClick={() => goMonth(shiftMonthKey(month, 1))}>
          <IconRight />
        </button>
      </div>
      <div className="tracker-chips">
        {keys.map((k) => (
          <button key={k} type="button" className="chip" aria-current={k === month} onClick={() => goMonth(k)}>
            {monthShort(k)}
          </button>
        ))}
        <input
          className="month-input"
          type="month"
          value={month}
          min="2000-01"
          max="2100-12"
          aria-label="Jump to month"
          onChange={(e) => isMonthKey(e.target.value) && goMonth(e.target.value)}
        />
      </div>
      {/* Second entry point to the expense dialog, so adding (the most common
          action) doesn't need a scroll to the Expenses toolbar (PRD §6.3.6).
          Same disabled rule as the toolbar button. */}
      {tracker && expenses && (
        <button
          type="button"
          className="btn primary rail-add"
          disabled={!hasCats}
          title={hasCats ? undefined : "Add a category first"}
          onClick={() => open({ kind: "expense" })}
        >
          <IconPlus /> Add expense
        </button>
      )}
    </section>
  );
}

/* ---------- Empty month (PRD §6.3.3) ---------- */
export function EmptyMonth() {
  const { state, month, ops, copyHint } = useTracker();
  const [busy, setBusy] = useState(false);
  const n = state.categories.length;
  return (
    <section className="empty">
      <span className="eyebrow">No tracker yet</span>
      <h2>Start the {monthLabel(month)} tracker</h2>
      <p>
        {n
          ? `Your ${plural(n, "category", "categories")} ${n === 1 ? "is" : "are"} shared across months, so you can start adding expenses right away.`
          : "Create a tracker for this month, then add categories and expenses."}
      </p>
      <button
        type="button"
        className="btn primary"
        aria-busy={busy}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await ops.startCreateTracker();
          setBusy(false);
        }}
      >
        <IconPlus /> Create {monthLabel(month)} tracker
      </button>
      {copyHint && <span className="hint-line">You can copy recurring expenses from {copyHint} in the next step.</span>}
    </section>
  );
}

/* ---------- Summary math ---------- */
export type SummaryRow = { cat: Category; count: number; budget: number; actual: number; remaining: number };
export function useSummary() {
  const { state, expenses } = useTracker();
  return useMemo(() => {
    const list = expenses ?? [];
    const rows: SummaryRow[] = state.categories.map((c) => {
      const ex = list.filter((x) => x.category_id === c.id);
      const budget = ex.reduce((s, x) => s + x.budgeted_cents, 0);
      const actual = ex.reduce((s, x) => s + x.actual_cents, 0);
      return { cat: c, count: ex.length, budget, actual, remaining: budget - actual };
    });
    const budget = rows.reduce((s, r) => s + r.budget, 0);
    const actual = rows.reduce((s, r) => s + r.actual, 0);
    return { rows, tot: { budget, actual, remaining: budget - actual, count: list.length } };
  }, [state.categories, expenses]);
}

/* ---------- KPI row (PRD §6.3.5) ---------- */
export function Kpis() {
  const { state } = useTracker();
  const { tot } = useSummary();
  const ratio = tot.budget ? (tot.actual / tot.budget) * 100 : 0;
  const pct = Math.min(100, ratio);
  const over = tot.actual > tot.budget && tot.budget > 0;
  return (
    <section className="kpis" aria-label="Month totals">
      <div className="kpi">
        <span className="eyebrow">Budgeted</span>
        <span className="val">{fmtCents(tot.budget)}</span>
        <span className="foot">
          {plural(tot.count, "expense")} across {plural(state.categories.length, "category", "categories")}
        </span>
      </div>
      <div className="kpi">
        <span className="eyebrow">Actual spent</span>
        <span className="val">{fmtCents(tot.actual)}</span>
        <div className={`meter${over ? " over" : ""}`} role="progressbar" aria-label="Budget used" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <span className="foot">{ratio.toFixed(1)}% of budget used</span>
      </div>
      <div className={`kpi remain${tot.remaining < 0 ? " neg" : ""}`}>
        <span className="eyebrow">Remaining</span>
        <span className="val">{fmtCents(tot.remaining)}</span>
        <span className="foot">{tot.remaining < 0 ? "Over budget this month" : "Budgeted minus actual"}</span>
      </div>
    </section>
  );
}

/* ---------- Chart + summary with the resizable split ---------- */
export function ChartSummary() {
  const { split, setSplit } = useTracker();
  const splitRef = useRef<HTMLElement>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = splitRef.current;
    if (!el) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    setDragging(true);
    document.body.classList.add("resizing");
    let last = split;
    const move = (ev: globalThis.PointerEvent) => {
      last = ((ev.clientX - rect.left - 8) / rect.width) * 100;
      setSplit(last, false);
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      setDragging(false);
      document.body.classList.remove("resizing");
      setSplit(last, true);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    let v = split;
    if (e.key === "ArrowLeft") v -= step;
    else if (e.key === "ArrowRight") v += step;
    else if (e.key === "Home") v = SPLIT_MIN;
    else if (e.key === "End") v = SPLIT_MAX;
    else return;
    e.preventDefault();
    setSplit(v);
  };

  return (
    <section className="split" ref={splitRef} style={{ ["--left" as string]: `${split}%` }}>
      <div className="panel chart-panel">
        <div className="panel-head">
          <h2>Budget vs actual</h2>
        </div>
        <BudgetChart />
      </div>
      <div
        className={`resizer${dragging ? " dragging" : ""}`}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize chart and summary"
        aria-valuemin={SPLIT_MIN}
        aria-valuemax={SPLIT_MAX}
        aria-valuenow={Math.round(split)}
        tabIndex={0}
        title="Drag to resize · double-click to reset"
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        onDoubleClick={() => setSplit(SPLIT_DEFAULT)}
      />
      <CategorySummary />
    </section>
  );
}

/* ---------- Nested pie: outer ring budgeted, inner pie actual ---------- */
function BudgetChart() {
  const { rows, tot } = useSummary();
  const [active, setActive] = useState<string | null>(null);
  if (!rows.length) {
    return (
      <div className="empty">
        <p>The chart appears once you add categories and expenses.</p>
      </div>
    );
  }
  const pctOf = (v: number, total: number) => (total ? ((v / total) * 100).toFixed(1) : "0.0");
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
            onMouseEnter={() => setActive(r.cat.id)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(r.cat.id)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(r.cat.id)}
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
            <li
              key={row.cat.id}
              className={active === row.cat.id ? "on" : ""}
              tabIndex={0}
              onMouseEnter={() => setActive(row.cat.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(row.cat.id)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(row.cat.id)}
            >
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

/* ---------- Category summary ---------- */
function CategorySummary() {
  const { open } = useTracker();
  const { rows, tot } = useSummary();
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Category summary</h2>
        <button type="button" className="btn" onClick={() => open({ kind: "category" })}>
          <IconPlus /> Add category
        </button>
      </div>
      {rows.length ? (
        <div className="scroll">
          <table className="stack">
            <thead>
              <tr>
                <th>Category</th>
                <th className="r">Budgeted</th>
                <th className="r">Actual</th>
                <th className="r">Remaining</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.cat.id}>
                  <td className="lead">
                    <div className="cat-cell">
                      <span className="sw" style={{ background: r.cat.color }} />
                      <span>{r.cat.name}</span>
                      <span className="cnt" title={`${plural(r.count, "expense")} this month`}>{r.count}</span>
                    </div>
                  </td>
                  <td className="num r" data-label="Budgeted">{fmtCents(r.budget)}</td>
                  <td className="num r" data-label="Actual">{fmtCents(r.actual)}</td>
                  <td className={`num r${r.remaining < 0 ? " neg" : ""}`} data-label="Remaining">{fmtCents(r.remaining)}</td>
                  <td className="act">
                    <div className="row-actions">
                      <button type="button" className="icon-btn" aria-label={`Edit ${r.cat.name}`} onClick={() => open({ kind: "category", id: r.cat.id })}>
                        <IconEdit />
                      </button>
                      <button type="button" className="icon-btn del" aria-label={`Delete ${r.cat.name}`} onClick={() => open({ kind: "deleteCategory", id: r.cat.id })}>
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="lead">Total</td>
                <td className="num r" data-label="Budgeted">{fmtCents(tot.budget)}</td>
                <td className="num r" data-label="Actual">{fmtCents(tot.actual)}</td>
                <td className={`num r ${tot.remaining < 0 ? "neg" : "pos"}`} data-label="Remaining">{fmtCents(tot.remaining)}</td>
                <td className="act empty-cell" />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="empty">
          <p>No categories yet. Add one, like Bills or Insurance, to start budgeting.</p>
          <button type="button" className="btn primary" onClick={() => open({ kind: "category" })}>
            <IconPlus /> Add category
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Expenses (PRD §6.3.6) ---------- */
const SORT_LABELS: Record<SortKey, string> = {
  category: "Category",
  owner: "Owner",
  due: "Due date",
  budget: "Budgeted",
  actual: "Actual",
  remaining: "Remaining",
};
const MONEY_KEYS: SortKey[] = ["budget", "actual", "remaining"];

export function ExpensesSection() {
  const t = useTracker();
  const { state, expenses, filterCat, setFilterCat, sort, setSort, view, setView, open, ownerLabel, memberIndex } = t;
  const hasCats = state.categories.length > 0;
  const catOf = (id: string) => state.categories.find((c) => c.id === id);

  const sorted = useMemo(() => {
    let ex = (expenses ?? []).slice();
    if (filterCat !== "all") ex = ex.filter((x) => x.category_id === filterCat);
    const keyFns: Record<SortKey, (x: Expense) => string | number> = {
      category: (x) => (catOf(x.category_id)?.name ?? "").toLowerCase(),
      owner: (x) => ownerLabel(x.owner_id).toLowerCase(),
      due: (x) => x.due_date,
      budget: (x) => x.budgeted_cents,
      actual: (x) => x.actual_cents,
      remaining: (x) => x.budgeted_cents - x.actual_cents,
    };
    const fn = keyFns[sort.key];
    const dir = sort.dir === "desc" ? -1 : 1;
    return ex.sort((a, b) => {
      const A = fn(a);
      const B = fn(b);
      const c = typeof A === "number" && typeof B === "number" ? A - B : String(A).localeCompare(String(B));
      return c ? c * dir : a.due_date.localeCompare(b.due_date) || a.created_at.localeCompare(b.created_at);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, filterCat, sort, state.categories, ownerLabel]);

  const clickSort = (k: SortKey) =>
    setSort(sort.key === k ? { key: k, dir: sort.dir === "asc" ? "desc" : "asc" } : { key: k, dir: MONEY_KEYS.includes(k) ? "desc" : "asc" });

  const owner = (id: string) => (
    <span className="owner">
      <span className="av" style={{ background: memberColor(memberIndex(id)) }}>{initials(t.memberName(id))}</span>
      {ownerLabel(id)}
    </span>
  );
  const pill = (x: Expense) => {
    const [cls, txt] = statusOf(x);
    return <span className={`pill ${cls}`}>{txt}</span>;
  };
  const actions = (x: Expense) => (
    <div className="row-actions">
      <button type="button" className="icon-btn" aria-label={`Edit ${x.name}`} onClick={() => open({ kind: "expense", id: x.id })}>
        <IconEdit />
      </button>
      <button type="button" className="icon-btn del" aria-label={`Delete ${x.name}`} onClick={() => open({ kind: "deleteExpense", id: x.id })}>
        <IconTrash />
      </button>
    </div>
  );
  const th = (k: SortKey, right = false) => (
    <th className={right ? "r" : ""} aria-sort={sort.key === k ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className="sort-btn" aria-label={`Sort by ${SORT_LABELS[k]}`} onClick={() => clickSort(k)}>
        {k === "due" ? "Due" : SORT_LABELS[k]}
        <span className="arr" aria-hidden="true">{sort.key === k ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}</span>
      </button>
    </th>
  );

  let body;
  if (!hasCats) {
    body = (
      <div className="empty">
        <p>Expenses live inside categories. Add a category first, then add expenses to it.</p>
        <button type="button" className="btn primary" onClick={() => open({ kind: "category" })}>
          <IconPlus /> Add category
        </button>
      </div>
    );
  } else if (!sorted.length) {
    body = (
      <div className="empty">
        <p>No expenses {filterCat !== "all" ? "in this category " : ""}yet.</p>
        <button type="button" className="btn primary" onClick={() => open({ kind: "expense" })}>
          <IconPlus /> Add expense
        </button>
      </div>
    );
  } else if (view === "table") {
    body = (
      <div className="scroll">
        <table className="stack">
          <thead>
            <tr>
              <th>Expense</th>
              {th("category")}
              {th("owner")}
              {th("due")}
              {th("budget", true)}
              {th("actual", true)}
              {th("remaining", true)}
              <th>Status</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((x) => {
              const c = catOf(x.category_id);
              const rem = x.budgeted_cents - x.actual_cents;
              return (
                <tr key={x.id}>
                  <td className="exp-name lead">{x.name}</td>
                  <td data-label="Category">
                    <div className="cat-cell">
                      <span className="sw" style={{ background: c?.color ?? "var(--faint)" }} />
                      {c?.name ?? "Unknown"}
                    </div>
                  </td>
                  <td data-label="Owner">{owner(x.owner_id)}</td>
                  <td className="mono" data-label="Due">{fmtDue(x.due_date)}</td>
                  <td className="num r" data-label="Budgeted">{fmtCents(x.budgeted_cents)}</td>
                  <td className="num r" data-label="Actual">{fmtCents(x.actual_cents)}</td>
                  <td className={`num r${rem < 0 ? " neg" : ""}`} data-label="Remaining">{fmtCents(rem)}</td>
                  <td data-label="Status">{pill(x)}</td>
                  <td className="act">{actions(x)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  } else {
    const cats = state.categories.filter((c) => sorted.some((x) => x.category_id === c.id));
    body = (
      <div className="groups">
        {cats.map((c) => {
          const items = sorted.filter((x) => x.category_id === c.id);
          const b = items.reduce((s, x) => s + x.budgeted_cents, 0);
          const a = items.reduce((s, x) => s + x.actual_cents, 0);
          return (
            <div className="group" key={c.id}>
              <div className="group-head">
                <h3>
                  <span className="sw" style={{ background: c.color }} />
                  {c.name}
                </h3>
                <span className="tot">
                  {fmtCents(a)} of {fmtCents(b)}
                </span>
              </div>
              {items.map((x) => {
                const bb = x.budgeted_cents;
                const aa = x.actual_cents;
                const p = bb ? Math.min(100, (aa / bb) * 100) : aa > 0 ? 100 : 0;
                return (
                  <div className="item" key={x.id}>
                    <div>
                      <div className="exp-name">{x.name}</div>
                      <div className="meta">
                        <span className="mono">Due {fmtDue(x.due_date)}</span>
                        {owner(x.owner_id)}
                        {pill(x)}
                      </div>
                    </div>
                    <div className="amt">
                      {fmtCents(aa)}
                      <small>
                        of {fmtCents(bb)} · {bb - aa < 0 ? `over by ${fmtCents(aa - bb)}` : `${fmtCents(bb - aa)} left`}
                      </small>
                    </div>
                    <div className="bar">
                      <div className={`meter${aa > bb ? " over" : ""}`} aria-hidden="true">
                        <i style={{ width: `${p}%` }} />
                      </div>
                      {actions(x)}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <section className="panel" aria-label="Expenses">
      <div className="panel-head">
        <h2>Expenses</h2>
        <div className="toolbar">
          <select className="select" aria-label="Filter by category" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="all">All categories</option>
            {state.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {view === "table" && (
            <select
              className="select sort-select"
              aria-label="Sort expenses"
              value={`${sort.key}:${sort.dir}`}
              onChange={(e) => {
                const [k, d] = e.target.value.split(":") as [SortKey, "asc" | "desc"];
                setSort({ key: k, dir: d });
              }}
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).flatMap((k) => {
                const num = MONEY_KEYS.includes(k);
                const dt = k === "due";
                const opts: ["asc" | "desc", string][] = num
                  ? [["desc", "highest first"], ["asc", "lowest first"]]
                  : [["asc", dt ? "earliest first" : "A–Z"], ["desc", dt ? "latest first" : "Z–A"]];
                return opts.map(([d, txt]) => (
                  <option key={`${k}:${d}`} value={`${k}:${d}`}>
                    {SORT_LABELS[k]}: {txt}
                  </option>
                ));
              })}
            </select>
          )}
          <div className="seg" role="group" aria-label="View">
            <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}>
              <IconTable /><span>Table</span>
            </button>
            <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
              <IconList /><span>List</span>
            </button>
          </div>
          <button
            type="button"
            className="btn primary"
            disabled={!hasCats}
            title={hasCats ? undefined : "Add a category first"}
            onClick={() => open({ kind: "expense" })}
          >
            <IconPlus /> Add expense
          </button>
        </div>
      </div>
      {!hasCats && <span className="hint-line" style={{ marginTop: -6 }}>Add a category first</span>}
      {body}
    </section>
  );
}
