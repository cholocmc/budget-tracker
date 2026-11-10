import { CurrentMonth } from "@/components/CurrentMonth";
import { Footer } from "@/components/Footer";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { LogoMark } from "@/components/Icons";
import { PreviewCard } from "@/components/landing/PreviewCard";
import { ThemeSwitch } from "@/components/ThemeSwitch";

const FEATURES = [
  {
    title: "A tracker for every month",
    body: "Opens on the current month. Jump between months or start a new one in a click.",
    points: ["Copy recurring bills from last month", "Due dates carry over to the same day"],
    icon: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  },
  {
    title: "Categories that follow you",
    body: "Bills, Insurance, Medicine, or anything you need. Define them once and use them every month.",
    points: ["Rename once, every expense updates", "Deletes ask you to confirm first"],
    icon: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  },
  {
    title: "Expenses with owners and due dates",
    body: "Record the budgeted and actual amount for each expense, who handles it, and when it's due.",
    points: ["Settled, partly paid, overdue at a glance", "Amounts formatted as you type"],
    icon: <><path d="M7 4h10l2 3v13H5V7z" /><path d="M9 11h6M9 15h4" /></>,
  },
  {
    title: "Budget vs actual, in one chart",
    body: "The outer ring shows what you planned. The inner pie shows what you spent. Both split by category.",
    points: ["Category summary with remaining totals", "Overspending shows up in red"],
    icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 3v5" /></>,
  },
  {
    title: "Table or list, your call",
    body: "Scan everything in a sortable table, or switch to a list grouped by category.",
    points: ["Sort by category, owner, due date, or amount", "Filter to a single category"],
    icon: <><path d="M3 6h18M3 12h18M3 18h12" /><path d="M19 15v6M16.5 18.5L19 21l2.5-2.5" /></>,
  },
  {
    title: "One household, shared",
    body: "Share your household code with your partner or family. Every member can add, edit, and delete, so the budget stays current.",
    points: ["Each person belongs to one household", "Works on phone and desktop, light or dark"],
    icon: <><circle cx="9" cy="8" r="3.5" /><circle cx="17" cy="9" r="2.5" /><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5M15 14.5c2.5 0 4.5 1.5 5.5 4.5" /></>,
  },
];

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ auth_error?: string }> }) {
  const { auth_error } = await searchParams;
  const authError = auth_error ? "Google sign-in didn't finish. Try again." : null;

  return (
    <div className="pg-landing">
      <div className="lwrap">
        <nav aria-label="Main">
          <div className="lbrand">
            <LogoMark />
            Monthly Budget Tracker
          </div>
          <div className="nav-right">
            <ThemeSwitch />
            <a className="btn-ghost" href="#start">
              <span className="lbl">Sign in</span>
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </nav>

        <header className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Shared household budgeting</span>
            <h1>
              Plan every peso. <em>See where it went.</em>
            </h1>
            <p className="lede">
              Set a budget for each category, log what you actually spend, and see the gap every month. Your whole
              household works in the same tracker, so bills and due dates never fall through the cracks.
            </p>
            <div className="cta-row" id="start">
              <GoogleSignIn initialError={authError} />
              <p className="fine">Start your own household, or join one with a household code.</p>
            </div>
          </div>
          <PreviewCard />
        </header>
      </div>

      <section aria-labelledby="f-title">
        <div className="lwrap">
          <div className="sec-head">
            <span className="eyebrow">What you can do</span>
            <h2 id="f-title">Everything a monthly budget needs, and nothing it doesn&apos;t</h2>
            <p>
              Built around how households actually pay bills: one tracker per month, shared categories, and a clear
              picture of budget against reality.
            </p>
          </div>
          <div className="features">
            {FEATURES.map((f) => (
              <article className="feature" key={f.title}>
                <div className="ico" aria-hidden="true">
                  <svg viewBox="0 0 24 24">{f.icon}</svg>
                </div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
                <ul>
                  {f.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="s-title" style={{ paddingTop: 8 }}>
        <div className="lwrap">
          <div className="sec-head">
            <span className="eyebrow">Getting started</span>
            <h2 id="s-title">Set up in about two minutes</h2>
          </div>
          <ol className="steps">
            <li>
              <h3>Sign in with Google</h3>
              <p>No new password to remember. Your account is ready right away.</p>
            </li>
            <li>
              <h3>Create or join a household</h3>
              <p>
                Start a new household and share its code with the people who split your bills. Got a code from
                someone? Enter it to join their household instead.
              </p>
            </li>
            <li>
              <h3>Plan the month</h3>
              <p>Add categories and expenses, then log payments as they happen. Next month, copy the recurring ones over.</p>
            </li>
          </ol>
        </div>
      </section>

      <section style={{ paddingTop: 8 }}>
        <div className="lwrap">
          <div className="closing">
            <span className="eyebrow">Start this month</span>
            <h2>
              Your first tracker opens on <CurrentMonth />
            </h2>
            <p>Sign in, add your bills, and know exactly what&apos;s left before the month ends.</p>
            <div className="cta-row">
              <GoogleSignIn />
            </div>
          </div>
        </div>
      </section>

      <div className="lwrap">
        <Footer className="lfoot" />
      </div>
    </div>
  );
}
