"use client";

import { arcPath } from "@/lib/chart";
import { CurrentMonth } from "@/components/CurrentMonth";

// Example numbers for the marketing preview (the card is tagged "Example data").
const DATA = [
  { name: "Bills", color: "#22D88F", b: 33099, a: 30680 },
  { name: "Groceries", color: "#7B6CF0", b: 12000, a: 7350 },
  { name: "Transport", color: "#F2B53C", b: 5500, a: 3800 },
  { name: "Insurance", color: "#16B8C9", b: 5300, a: 3200 },
  { name: "Medicine", color: "#9BD93B", b: 1800, a: 1450 },
];
const tb = DATA.reduce((s, d) => s + d.b, 0);
const ta = DATA.reduce((s, d) => s + d.a, 0);
const peso = (n: number) => "₱" + n.toLocaleString("en-PH");

function slices(key: "a" | "b", total: number, rO: number, rI: number) {
  let a = 0;
  return DATA.map((d) => {
    const span = (d[key] / total) * Math.PI * 2;
    const path = <path key={d.name} d={arcPath(120, 120, rO, rI, a, a + span)} fill={d.color} stroke="var(--surface)" strokeWidth={2} />;
    a += span;
    return path;
  });
}

export function PreviewCard() {
  return (
    <figure className="preview" aria-label="Preview of the tracker with example numbers">
      <div className="pv-head">
        <div className="pv-month">
          <CurrentMonth />
        </div>
        <span className="pv-tag">Example data</span>
      </div>
      <div className="pv-body">
        <svg viewBox="0 0 240 240" role="img" aria-label="Budgeted by category in the outer ring, actual spending in the inner pie">
          <g className="ring-group">{slices("b", tb, 116, 86)}</g>
          <g className="pie-group">{slices("a", ta, 76, 0)}</g>
        </svg>
        <ul className="pv-legend">
          {DATA.map((d) => (
            <li key={d.name}>
              <span className="sw" style={{ background: d.color }} />
              <span>{d.name}</span>
              <span className="amt">
                {peso(d.a)} / {peso(d.b)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="pv-key">
        <span><i className="k-ring" />Outer ring: budgeted</span>
        <span><i className="k-pie" />Inner pie: actual</span>
      </div>
      <div className="pv-kpis">
        <div className="pv-kpi"><span>Budgeted</span><b>{peso(tb)}</b></div>
        <div className="pv-kpi"><span>Actual</span><b>{peso(ta)}</b></div>
        <div className="pv-kpi rem"><span>Remaining</span><b>{peso(tb - ta)}</b></div>
      </div>
    </figure>
  );
}
