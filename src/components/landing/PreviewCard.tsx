import { arcPath } from "@/lib/chart";
import { CurrentMonth } from "@/components/CurrentMonth";

// Example household for the marketing preview (PRD §6.1). The card is tagged "Example data"; the people,
// categories, and amounts are made up. Amounts are whole pesos.
const MEMBERS = [
  { name: "Ana", initial: "A", color: "#22D88F" },
  { name: "Migs", initial: "M", color: "#F2B53C" },
];
const DATA = [
  { name: "Rent", color: "#7B6CF0", b: 18000, a: 18000 },
  { name: "Groceries", color: "#16B8C9", b: 12000, a: 7350 },
  { name: "Tuition", color: "#3FA7F5", b: 9500, a: 4750 },
  { name: "Utilities", color: "#EF6F8E", b: 6500, a: 7120 },
  { name: "Transport", color: "#9BD93B", b: 4000, a: 2600 },
];
// A few of the month's expenses, one per status worth showing: who pays it, when it's due, where it stands.
const BILLS = [
  { name: "Meralco", owner: 0, due: "Due the 18th", a: 4620, b: 4000, status: ["over", "Over budget"] },
  { name: "Rent", owner: 1, due: "Due the 5th", a: 18000, b: 18000, status: ["settled", "Settled"] },
  { name: "Tuition", owner: 0, due: "Due the 28th", a: 4750, b: 9500, status: ["partial", "Partly paid"] },
] as const;

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

function Face({ m }: { m: (typeof MEMBERS)[number] }) {
  return (
    <span className="pv-av" style={{ background: m.color }} aria-hidden="true">
      {m.initial}
    </span>
  );
}

export function PreviewCard() {
  return (
    <figure className="preview" aria-label="Preview of a shared household tracker with example data">
      <div className="pv-head">
        <div className="pv-house">
          <span className="pv-avs">
            {MEMBERS.map((m) => (
              <Face key={m.name} m={m} />
            ))}
          </span>
          <span>
            Santos household <span className="pv-sub">· Ana and Migs</span>
          </span>
        </div>
        <span className="pv-tag">Example data</span>
      </div>
      <div className="pv-month">
        <CurrentMonth />
      </div>

      <div className="pv-body">
        <svg viewBox="0 0 240 240" role="img" aria-label="Budgeted by category in the outer ring, actual spending in the inner circle">
          <g className="ring-group">{slices("b", tb, 116, 86)}</g>
          <g className="pie-group">{slices("a", ta, 76, 0)}</g>
        </svg>
        <ul className="pv-legend">
          {DATA.map((d) => (
            <li key={d.name}>
              <span className="sw" style={{ background: d.color }} />
              <span className="nm">{d.name}</span>
              <span className={`amt${d.a > d.b ? " over" : ""}`}>
                {peso(d.a)} of {peso(d.b)}
                {d.a > d.b && <span className="sr-only">, over budget</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="pv-key">
        <span><i className="k-ring" />Outer ring: budgeted</span>
        <span><i className="k-pie" />Inner circle: actual</span>
      </div>

      <ul className="pv-bills" aria-label="Example expenses">
        {BILLS.map((x) => (
          <li key={x.name}>
            <Face m={MEMBERS[x.owner]} />
            <span className="pv-bill">
              <b>{x.name}</b>
              <span>
                {MEMBERS[x.owner].name} · {x.due}
              </span>
            </span>
            <span className={`pill ${x.status[0]}`}>{x.status[1]}</span>
            <span className={`pv-amt${x.a > x.b ? " over" : ""}`}>
              {peso(x.a)}
              <small>of {peso(x.b)}</small>
            </span>
          </li>
        ))}
      </ul>

      <dl className="pv-kpis">
        <div><dt>Budgeted</dt><dd>{peso(tb)}</dd></div>
        <div><dt>Actual</dt><dd>{peso(ta)}</dd></div>
        <div className="rem"><dt>Remaining</dt><dd>{peso(tb - ta)}</dd></div>
      </dl>
    </figure>
  );
}
