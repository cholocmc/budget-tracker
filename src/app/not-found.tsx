import Link from "next/link";
import { Footer } from "@/components/Footer";

export const metadata = { title: "Page not found · BudgetMate" };

// Shown for any unknown URL, e.g. a mistyped link from a shared post.
export default function NotFound() {
  return (
    <div className="wrap">
      <section className="left-card">
        <span className="eyebrow">Page not found</span>
        <h2>We couldn&apos;t find that page</h2>
        <p>The link may be mistyped or out of date. Head back to BudgetMate to sign in or open your tracker.</p>
        <div className="code-actions">
          <Link className="btn primary" href="/">
            Go to BudgetMate
          </Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
