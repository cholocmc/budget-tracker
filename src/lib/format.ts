export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Category colors (PRD §9.3). Must match the categories.color check constraint in the migrations. */
export const PALETTE = [
  "#22D88F", "#16B8C9", "#9BD93B", "#7B6CF0", "#F2B53C",
  "#EF6F8E", "#3FA7F5", "#1F8F6A", "#C97CF2", "#F28A3C",
  "#D9434F", "#E35FC0", "#F7A8C8", "#3F51C8", "#A65F30", "#E8E05A",
];

/** Accessible names for the swatches, in PALETTE order. */
export const PALETTE_NAMES = [
  "Mint", "Teal", "Lime", "Violet", "Amber", "Pink", "Blue", "Forest", "Purple", "Orange",
  "Crimson", "Magenta", "Blush", "Indigo", "Brown", "Yellow",
];

/** Avatar backgrounds: the original bright colors, which keep the dark initials readable. */
const AVATAR_COLORS = PALETTE.slice(0, 10);

const pad = (n: number) => String(n).padStart(2, "0");

/* ---------- Months ("YYYY-MM" keys, local time) ---------- */
export const monthKey = (y: number, m: number) => `${y}-${pad(m)}`; // m is 1-12
export const parseMonthKey = (k: string) => {
  const [y, m] = k.split("-").map(Number);
  return { y, m };
};
export const isMonthKey = (k: string | undefined | null): k is string =>
  !!k && /^\d{4}-(0[1-9]|1[0-2])$/.test(k) && +k.slice(0, 4) >= 2000 && +k.slice(0, 4) <= 2100;
export const currentMonthKey = () => {
  const d = new Date();
  return monthKey(d.getFullYear(), d.getMonth() + 1);
};
/** The current month in an IANA time zone, for the server's best guess at the viewer's month. */
export const monthKeyInZone = (timeZone: string) => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "numeric" }).formatToParts(new Date());
    const y = Number(parts.find((p) => p.type === "year")?.value);
    const m = Number(parts.find((p) => p.type === "month")?.value);
    return y && m ? monthKey(y, m) : null;
  } catch {
    return null; // Unknown time zone.
  }
};
export const shiftMonthKey =(k: string, delta: number) => {
  const { y, m } = parseMonthKey(k);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d.getFullYear(), d.getMonth() + 1);
};
export const monthLabel = (k: string) => {
  const { y, m } = parseMonthKey(k);
  return `${MONTHS[m - 1]} ${y}`;
};
export const monthShort = (k: string) => {
  const { y, m } = parseMonthKey(k);
  return `${MONTHS[m - 1].slice(0, 3)} ${y}`;
};
export const lastDayOf = (k: string) => {
  const { y, m } = parseMonthKey(k);
  return new Date(y, m, 0).getDate();
};
export const currentMonthLabel = () => monthLabel(currentMonthKey());

/* ---------- Dates ---------- */
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const fmtDue = (iso: string) => {
  if (!iso) return "—";
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}`;
};
/** A timestamptz as "Nov 15" in the user's local time (the Created column, PRD §6.3.6). */
export const fmtCreated = (ts: string) => {
  const d = new Date(ts);
  if (!ts || Number.isNaN(d.getTime())) return "—";
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
};
/**
 * "today", "yesterday", "3 days ago" up to 13 days, then "Nov 3", counted in local calendar days
 * (profile accounts, PRD §6.7).
 */
export const fmtSince = (ts: string, now: Date) => {
  const d = new Date(ts);
  if (!ts || Number.isNaN(d.getTime())) return "—";
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  return fmtCreated(ts);
};
/** The same day of month in another month, clamped to that month's last day. */
export const shiftDue = (iso: string, targetMonth: string) => {
  const d = Math.min(parseInt(iso.slice(8, 10), 10) || 1, lastDayOf(targetMonth));
  return `${targetMonth}-${pad(d)}`;
};

/* ---------- Money (integer centavos) ---------- */
const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const fmtCents = (cents: number) => peso.format((Number(cents) || 0) / 100);

/** Plain amount for inputs, e.g. 2500000 -> "25,000.00". */
export const centsToInput = (cents: number) =>
  ((Number(cents) || 0) / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "25,000.5" -> 2500050. Blank -> 0. NaN for anything malformed. */
export const inputToCents = (v: string) => {
  const s = String(v ?? "").replace(/,/g, "").trim();
  if (s === "") return 0;
  if (s === "." || !/^\d*(\.\d{0,2})?$/.test(s)) return NaN;
  const [a, b = ""] = s.split(".");
  return Number(a || "0") * 100 + Number((b + "00").slice(0, 2));
};

/** Digits and one point, at most 2 decimals, no leading zeros, at most 12 integer digits, with commas. */
export const cleanMoneyInput = (v: string) => {
  let s = v.replace(/[^\d.]/g, "");
  const i = s.indexOf(".");
  if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, "").slice(0, 2);
  const parts = s.split(".");
  const a = (parts[0] || "").replace(/^0+(?=\d)/, "").slice(0, 12);
  const withCommas = a.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return withCommas + (parts.length > 1 ? "." + parts[1] : "");
};

/* ---------- Household codes ---------- */
export const formatCodeInput = (v: string) => {
  const raw = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
};

/* ---------- People ---------- */
export const initials = (name: string) =>
  (name || "?")
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
export const memberColor = (index: number) =>
  AVATAR_COLORS[((index < 0 ? 0 : index) * 3 + 1) % AVATAR_COLORS.length];

export const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

/* ---------- Derived status (PRD §4.5) ---------- */
export type StatusKey = "over" | "settled" | "partial" | "overdue" | "upcoming";
export function statusOf(x: { budgeted_cents: number; actual_cents: number; due_date: string }): [StatusKey, string] {
  const b = Number(x.budgeted_cents) || 0;
  const a = Number(x.actual_cents) || 0;
  if (a > b) return ["over", "Over budget"];
  if (b > 0 && a >= b) return ["settled", "Settled"];
  if (a > 0) return ["partial", "Partly paid"];
  if (x.due_date && x.due_date < todayISO()) return ["overdue", "Overdue"];
  return ["upcoming", "Upcoming"];
}
