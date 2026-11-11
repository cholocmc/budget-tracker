import { ImageResponse } from "next/og";

// Link-preview card shown by Messenger, Slack, X, etc. Copy follows the
// landing hero (PRD §6.1); colors are the dark-theme tokens in globals.css.
export const alt = "Monthly Budget Tracker — Plan every peso. See where it went.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const C = {
  bg: "#06110D",
  surface: "#0C1E17",
  line: "#1B3B2F",
  fg: "#E3F6EC",
  muted: "#8DB2A2",
  faint: "#5C8473",
  accent: "#3DF5A0",
  accent2: "#16B8C9",
  ink: "#03140C",
  warn: "#F2C94C",
  danger: "#FF7070",
};
const GRADIENT = `linear-gradient(135deg, ${C.accent}, ${C.accent2})`;

// Sora (display) and IBM Plex Sans (body, which has the ₱ glyph) from Google
// Fonts. Satori can't read woff2, and the CSS API serves TTF when no browser
// user agent is sent. Falls back to the built-in font if the fetch fails so the
// build never breaks over a preview.
async function loadFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`,
    ).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

const ROWS = [
  { name: "Groceries", budget: 12000, actual: 9850, color: "#3DF5A0" },
  { name: "Utilities", budget: 6500, actual: 6500, color: "#16B8C9" },
  { name: "Transport", budget: 4000, actual: 4620, color: "#F2C94C" },
  { name: "Dining out", budget: 3000, actual: 1340, color: "#B18CFF" },
];
const peso = (n: number) => `₱${n.toLocaleString("en-US")}`;

export default async function Image() {
  const display = "Monthly Budget TrackerPlan every peso.See where it went.";
  const body =
    "Shared household budgeting — budget vs actual, every month.This monthBudget vs actual /" +
    ROWS.map((r) => r.name + peso(r.actual) + peso(r.budget)).join("");
  const loaded = await Promise.all([
    loadFont("Sora", 700, display).then((data) => ({ name: "Sora", data, weight: 700 as const })),
    loadFont("Sora", 600, display).then((data) => ({ name: "Sora", data, weight: 600 as const })),
    loadFont("IBM Plex Sans", 400, body).then((data) => ({ name: "Plex", data, weight: 400 as const })),
    loadFont("IBM Plex Sans", 600, body).then((data) => ({ name: "Plex", data, weight: 600 as const })),
  ]);
  const fonts = loaded.flatMap((f) => (f.data ? [{ ...f, data: f.data, style: "normal" as const }] : []));
  const displayFont = fonts.some((f) => f.name === "Sora") ? "Sora" : undefined;
  const bodyFont = fonts.some((f) => f.name === "Plex") ? "Plex" : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: C.bg,
          backgroundImage: `radial-gradient(circle at 85% 20%, rgba(22,184,201,.22), transparent 45%), radial-gradient(circle at 10% 100%, rgba(61,245,160,.18), transparent 50%)`,
          color: C.fg,
          padding: "64px 72px",
          fontFamily: bodyFont,
        }}
      >
        {/* Left: brand + headline */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, marginRight: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                backgroundImage: GRADIENT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 18l5-6 4 4 7-9" />
                <path d="M15 7h5v5" />
              </svg>
            </div>
            <div style={{ fontFamily: displayFont, fontWeight: 600, fontSize: 32 }}>Monthly Budget Tracker</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", fontFamily: displayFont, fontWeight: 700, fontSize: 64, lineHeight: 1.08, letterSpacing: -2 }}>
            <div>Plan every peso.</div>
            <div style={{ backgroundImage: GRADIENT, backgroundClip: "text", color: "transparent" }}>See where it went.</div>
          </div>

          <div style={{ fontSize: 28, color: C.muted, maxWidth: 560, lineHeight: 1.35 }}>
            Shared household budgeting — budget vs actual, every month.
          </div>
        </div>

        {/* Right: a mini budget-vs-actual card */}
        <div
          style={{
            width: 400,
            alignSelf: "center",
            display: "flex",
            flexDirection: "column",
            gap: 22,
            padding: 32,
            borderRadius: 24,
            background: C.surface,
            border: `2px solid ${C.line}`,
            boxShadow: "0 30px 80px rgba(0,0,0,.55)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 26, fontWeight: 600 }}>This month</div>
            <div style={{ fontSize: 18, color: C.faint }}>Budget vs actual</div>
          </div>
          {ROWS.map((r) => {
            const pct = Math.min(r.actual / r.budget, 1);
            const over = r.actual > r.budget;
            return (
              <div key={r.name} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 6, background: r.color }} />
                    {r.name}
                  </div>
                  <div style={{ color: over ? C.danger : C.muted }}>
                    {`${peso(r.actual)} / ${peso(r.budget)}`}
                  </div>
                </div>
                <div style={{ display: "flex", height: 12, borderRadius: 6, background: C.line }}>
                  <div style={{ width: `${pct * 100}%`, height: 12, borderRadius: 6, background: over ? C.danger : r.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
