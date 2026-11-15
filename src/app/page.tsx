import { CurrentMonth } from "@/components/CurrentMonth";
import { Footer } from "@/components/Footer";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { LogoMark } from "@/components/Icons";
import { PreviewCard } from "@/components/landing/PreviewCard";
import { ProfilePreview } from "@/components/landing/ProfilePreview";
import { ThemeSwitch } from "@/components/ThemeSwitch";

// Three benefits, each a job the household does (PRD §6.1). Supporting details sit in one line under each.
const BENEFITS = [
  {
    title: "Plan the month",
    body: "Give every expense a budgeted amount, grouped into categories you set up once. When a new month starts, copy the recurring bills over and their due dates come with them.",
    detail: "Rename a category once and every month follows",
  },
  {
    title: "Share it, as equals",
    body: "Everyone who joins with your household code can add, edit, and delete. Each expense has an owner and a due date, so it's clear who's paying what, and changes show up for everyone without a refresh.",
    detail: "Settled, partly paid, and overdue at a glance",
  },
  {
    title: "See the gap",
    body: "Log what you actually pay as it happens. The chart and totals show what's left in each category, and anything over budget turns red.",
    detail: "Sort and filter in a table, or read it as a list",
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
            Budget Mate
          </div>
          <div className="nav-right">
            <ThemeSwitch />
            <a className="btn-ghost" href="#start">
              Sign in
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
              <ul className="cta-notes">
                <li>
                  <b>Got a household code?</b> Sign in, then enter it to join.
                </li>
                <li>Google shares only your name, email, and profile photo.</li>
              </ul>
            </div>
          </div>
          <PreviewCard />
        </header>
      </div>

      <section aria-labelledby="f-title">
        <div className="lwrap benefits-wrap">
          <div className="sec-head">
            <h2 id="f-title">Everything a monthly budget needs, and nothing it doesn&apos;t</h2>
            <p>One tracker per month, shared by the whole household, with a clear picture of the plan against what was paid.</p>
          </div>
          <ol className="benefits">
            {BENEFITS.map((b) => (
              <li key={b.title}>
                <h3>{b.title}</h3>
                <div>
                  <p>{b.body}</p>
                  <p className="detail">{b.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="p-title">
        <div className="lwrap showcase">
          <div className="sec-head">
            <h2 id="p-title">Every account, one total</h2>
            <p>
              Keep the balance of each bank and e-wallet you use on your own profile, and see your total across all of
              them. Update a balance with one tap whenever it changes.
            </p>
            <ul className="checks">
              <li>Only you can see it. Other household members can&apos;t.</li>
              <li>See each account&apos;s share of your total</li>
              <li>Separate from your household&apos;s budget</li>
            </ul>
          </div>
          <ProfilePreview />
        </div>
      </section>

      <section aria-labelledby="s-title">
        <div className="lwrap">
          <div className="sec-head">
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

      <section aria-labelledby="c-title">
        <div className="lwrap">
          <div className="closing">
            <h2 id="c-title">
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
