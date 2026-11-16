"use client";

import { useEffect, useState } from "react";
import { CategoryBars, ChartSwitch, NestedPie, StatusBreakdown, TrendChart, type ChartKind } from "@/components/BudgetCharts";
import { currentMonthKey, monthKeyInZone, monthLabel, shiftMonthKey } from "@/lib/format";
import { CATEGORIES, EXPENSES, PAST_MONTHS } from "./example";

// The tracker's Budget vs actual card (PRD §6.3.5) with the Santos household's example month, for the
// landing page's charts section (PRD §6.1). It uses the same chart components as the tracker.

const ROWS = CATEGORIES.map((c) => ({
  cat: { id: c.id, name: c.name, color: c.color },
  alloc: c.alloc * 100,
  budget: c.b * 100,
  actual: c.a * 100,
}));
const ITEMS = EXPENSES.map((x) => ({ status: x.status, budget: x.b * 100, actual: x.a * 100 }));
const NOW = ROWS.reduce((s, r) => ({ budget: s.budget + r.budget, actual: s.actual + r.actual }), { budget: 0, actual: 0 });

export function ChartsPreview() {
  // The pie is already in the hero, so this card opens on Bars.
  const [kind, setKind] = useState<ChartKind>("bars");
  // Manila until scripts run (matching the server render), then the viewer's own month.
  const [month, setMonth] = useState(() => monthKeyInZone("Asia/Manila") ?? currentMonthKey());
  useEffect(() => setMonth(currentMonthKey()), []);

  const trend = [
    ...PAST_MONTHS.map((m, i) => ({ key: shiftMonthKey(month, i - PAST_MONTHS.length), budget: m.b * 100, actual: m.a * 100 })),
    { key: month, ...NOW },
  ];

  return (
    <figure className="preview cs" aria-label="Preview of the Budget vs actual charts with example data">
      <div className="pv-head">
        <div className="cs-title">
          <b>Budget vs actual</b>
          <span className="pv-sub" suppressHydrationWarning>
            Santos household · {monthLabel(month)}
          </span>
        </div>
        <span className="pv-tag">Example data</span>
      </div>
      <ChartSwitch kind={kind} onPick={setKind} />
      <div className="cs-body">
        {kind === "pie" && <NestedPie rows={ROWS} />}
        {kind === "bars" && <CategoryBars rows={ROWS} />}
        {kind === "status" && <StatusBreakdown items={ITEMS} />}
        {kind === "trend" && <TrendChart data={trend} current={month} />}
      </div>
    </figure>
  );
}
