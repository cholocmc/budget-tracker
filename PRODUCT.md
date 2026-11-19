# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Filipino households who share bills: couples, partners, and families who plan in pesos and split the month's spending between them. One person usually creates the household and shares its code; everyone else joins as an equal member. They come back through the month to log payments as they happen, on a phone as often as on a desktop, in light or dark mode.

## Product Purpose

BudgetMate gives a household one shared tracker per month. Members plan a budgeted amount for each expense, grouped into household-wide categories, log the actual amount as they pay, and see the gap per category and for the whole month. Recurring bills carry forward from the last month with expenses, so a new month takes seconds to set up.

Success means a household plans its month together, nobody misses a bill or due date, and everyone can see at a glance where the money went compared with the plan.

A separate private profile lets each user keep the balances of their own banks and e-wallets and see their total. It is personal, never shared with the household, and never feeds tracker numbers.

## Positioning

A shared, planned, manual budget. The whole household edits one live tracker as equals, with no roles to manage and changes from other members appearing without a refresh. It is built around planning a budget per category and logging actuals by hand. There is no bank syncing or transaction import: the household records what it decided and what it paid, deliberately.

## Operating Context

- Sign-in is Google only. A user belongs to exactly one household at a time; creating or joining another requires leaving first.
- Households grow by sharing an `XXXX-XXXX` household code (no 0, O, 1, or I, so it reads aloud cleanly). Joining always shows a confirmation step before it happens.
- The monthly rhythm: create the month's tracker, choose which of last month's expenses to copy, then log actual payments through the month and watch statuses (Upcoming, Partly paid, Settled, Overdue, Over budget) change.
- Several members may have the tracker open at once. Live sync, "deleted by {member}" notices, and conflict handling on simultaneous edits are part of everyday use.

## Capabilities and Constraints

- **Spec:** `docs/PRD.md` is the source of truth for behavior, copy, and business rules. Follow its wording for user-facing text.
- **Currency:** Philippine Peso (₱) only, formatted `en-PH` with 2 decimals. Money is stored as integer centavos.
- **Months** are resolved in the user's local time. The tracker opens on the current month.
- **Status is derived, never stored**, and is never shown by color alone.
- **Permissions:** all members are equal. The owner can't leave but can delete the whole household. Members can leave on their own.
- **Out of scope for v1, with no UI:** bank syncing, receipt scanning, transaction import, multiple currencies, income tracking, savings goals, forecasting, roles beyond owner and member, ownership transfer, removing other members, expiring codes, and native mobile apps.
- **Destructive actions** (deleting a category, a month's tracker, or the household) cascade and require typed confirmation with the impact shown first.
- **Stack:** Next.js 16 App Router with Tailwind CSS 3 and Supabase (Auth, Postgres with RLS, Realtime). Charts are hand-built SVG, with no chart library.

## Brand Commitments

- **Name:** BudgetMate.
- **Landing headline:** "Plan every peso. See where it went."
- **Footer:** "BudgetMate · Built by First Mate", a one-line blurb, and a copyright line, linking to https://www.firstmate.tech/, on every page.
- **Google sign-in** follows Google's branding guidelines. Its logo is never redrawn by hand.
- **Voice:** plain, direct, and specific. Copy names the exact consequence ("This can't be undone.", "Nothing changes at your bank.") and errors say how to fix the problem.

## Evidence on Hand

- No real users, testimonials, quotes, usage numbers, press, or screenshots of real use exist yet. Future work must not invent any of them.
- The landing page uses example data only, labeled "Example data". Example accounts and amounts are made up, never a real user's data.

## Product Principles

1. **Equal by default.** Every member can do everything. Never design in hierarchy, approvals, or per-member permissions.
2. **The plan and the reality, side by side.** Budgeted vs. actual and the gap between them is the core reading of every month.
3. **Deliberate, not automatic.** Manual entry is the point. Make logging a payment fast rather than trying to replace it.
4. **Consequences before commitment.** Anything destructive shows what it will remove and asks for a confirmation that fits the stakes.
5. **Private stays private.** Household data is shared; profile balances belong to one person and are labeled that way wherever they appear.

## Accessibility & Inclusion

- Works from 360px phones to wide desktops with no horizontal scroll. Tables stack below 640px, dialogs become bottom sheets, form inputs use 16px text, and touch targets are at least 40px.
- Dialogs are real in-page dialogs with focus trap and focus return. Focus is always visible. Errors use `role="alert"` and toasts `role="status"`.
- Respect `prefers-reduced-motion`.
