import { fmtCents } from "@/lib/format";

// Example accounts for the marketing preview (the card is tagged "Example data"). Amounts are centavos.
const ACCOUNTS = [
  { name: "BPI Savings", tile: "BP", color: "#22D88F", cents: 18645000, updated: "today" },
  { name: "Metrobank Payroll", tile: "MP", color: "#3FA7F5", cents: 9230050, updated: "yesterday" },
  { name: "Emergency fund", tile: "EF", color: "#7B6CF0", cents: 7500000, updated: "3 days ago" },
  { name: "GCash", tile: "GC", color: "#16B8C9", cents: 1284025, updated: "today" },
  { name: "Maya", tile: "MA", color: "#F2B53C", cents: 621575, updated: "5 days ago" },
];
const TOTAL = ACCOUNTS.reduce((s, a) => s + a.cents, 0);
const share = (cents: number) => (cents / TOTAL) * 100;

/** A static picture of the profile page (PRD §6.7) for the landing page's profile section (PRD §6.1). */
export function ProfilePreview() {
  return (
    <figure className="preview pf" aria-label="Preview of the profile page with example accounts">
      <div className="pv-head">
        <div className="pf-total">
          <span className="pf-label">Total balance</span>
          <b>{fmtCents(TOTAL)}</b>
          <span className="pf-foot">Across {ACCOUNTS.length} accounts · last updated today</span>
        </div>
        <span className="pv-tag">Example data</span>
      </div>
      <div className="pf-dist" aria-hidden="true">
        {ACCOUNTS.map((a) => (
          <span key={a.name} style={{ flexGrow: share(a.cents), background: a.color }} />
        ))}
      </div>
      <ul className="pf-list">
        {ACCOUNTS.map((a) => (
          <li key={a.name}>
            <span className="pf-tile" style={{ background: a.color }} aria-hidden="true">{a.tile}</span>
            <span className="pf-name">
              <b>{a.name}</b>
              <span>Updated {a.updated}</span>
            </span>
            <span className="pf-share" aria-hidden="true">
              <i style={{ width: `${share(a.cents)}%`, background: a.color }} />
            </span>
            <span className="pf-bal">
              {fmtCents(a.cents)}
              <span className="sr-only">, {share(a.cents).toFixed(1)}% of the total</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="pf-private">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        Only you can see your accounts.
      </div>
    </figure>
  );
}
