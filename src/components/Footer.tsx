import { LogoMark } from "@/components/Icons";

const FIRST_MATE = "https://www.firstmate.tech/";

// PRD §6.5. `className` adds page-specific spacing on top of the shared layout.
export function Footer({ className = "" }: { className?: string }) {
  return (
    <footer className={`site-foot ${className}`.trim()}>
      <div className="foot-brand">
        <LogoMark />
        <span className="foot-name">BudgetMate</span>
        <span className="foot-by">
          Built by{" "}
          <a href={FIRST_MATE} target="_blank" rel="noopener">
            First Mate
          </a>
        </span>
      </div>
      <p className="foot-blurb">
        Free shared household budgeting app for the Philippines, built by{" "}
        <a href={FIRST_MATE} target="_blank" rel="noopener">
          First Mate Technologies
        </a>
        .
      </p>
      <p className="foot-copy" suppressHydrationWarning>
        © {new Date().getFullYear()} BudgetMate
      </p>
    </footer>
  );
}
