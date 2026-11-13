import Link from "next/link";
import { Footer } from "@/components/Footer";

export const metadata = { title: "Signed out · Budget Mate" };

export default function SignedOutPage() {
  return (
    <div className="wrap">
      <section className="left-card">
        <span className="eyebrow">Signed out</span>
        <h2>You&apos;re signed out</h2>
        <p>Your household and its trackers are saved. Sign in with Google again to pick up where you left off.</p>
        <div className="code-actions">
          <Link className="btn primary" href="/">
            Go to the sign-in page
          </Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
