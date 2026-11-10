# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

Monthly Budget Tracker is a shared household budgeting web app.

- **Spec:** [docs/PRD.md](docs/PRD.md) is the source of truth for behavior, copy, and design. Read the relevant section before you change a feature, and cite it (for example "PRD §6.3.4") in code comments where it helps.
- **Setup:** see [README.md](README.md) for Supabase, Google OAuth, and env vars.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack).
  - The middleware file is `src/proxy.ts`, which exports `proxy`. Next 16 renamed `middleware`.
  - The Next docs are bundled in `node_modules/next/dist/docs`. Check them before using an API you're unsure about.
- **Tailwind CSS 3** with `tailwindcss/nesting`. Most styling is in `src/app/globals.css` (see Styling).
- **Supabase:**
  - Auth: Google only, with cookie sessions via `@supabase/ssr`.
  - Postgres with RLS on every table.
  - Realtime: `postgres_changes`, broadcast, and presence.
- Hand-built SVG for the chart. Don't add a chart library.

## Commands

```bash
npm run dev         # dev server on http://localhost:3000
npm run typecheck   # tsc --noEmit
npm run build       # production build; run before you consider work done
```

- There is no test suite and no linter config yet. Check your work with `typecheck` and `build`, and run the app when the UI changes.
- The dev server needs `.env.local`; copy `.env.example`. Never commit `.env*` files except `.env.example`.

## Layout

| Path | Purpose |
|---|---|
| `supabase/migrations/` | Schema, triggers, RLS, RPCs, and realtime publication |
| `src/proxy.ts` | Session refresh and redirects (PRD §2) |
| `src/app/` | Routes: `/`, `/onboarding`, `/tracker/[[...month]]`, `/auth/callback`, `/signed-out` |
| `src/components/tracker/` | Tracker client app |
| `src/components/onboarding/`, `src/components/landing/` | Page-specific client components |
| `src/components/` | Shared UI: `Modal`, `Toast`, `ThemeSwitch`, `GoogleSignIn`, `Icons`, `Footer` |
| `src/lib/format.ts` | Months, dates, money, codes, initials, derived status |
| `src/lib/data.ts` | Supabase queries shared by the server page and the client |
| `src/lib/errors.ts` | Maps RPC error codes to user-facing messages |
| `src/lib/supabase/` | Browser client (`getSupabase`), server client, and env |

Files in `src/components/tracker/`:

| File | What's in it |
|---|---|
| `TrackerApp.tsx` | State, realtime channel, and all data operations (`ops`) |
| `store.ts` | Reducer |
| `context.ts` | Context, types, and split-width constants |
| `sections.tsx` | Page sections |
| `dialogs.tsx` | Every dialog |
| `MoneyInput.tsx` | Peso input |

## Rules that are easy to break

### Database

- **Every schema change is a new migration file** in `supabase/migrations/`. Never edit a migration that has already been applied; add a new one.
- **RLS stays on for every table.** New tables need policies scoped with `public.my_household_id()`.
- **Multi-step or sensitive writes go through RPCs** (`security definer`, `set search_path`), and each checks `auth.uid()` itself. These include:
  - household create, join, and leave
  - code reset
  - tracker creation

  Simple CRUD on categories and expenses goes straight to the tables.
- **RPCs raise stable error codes** (`raise exception 'ALREADY_IN_HOUSEHOLD'`). Add each new code and its message to `src/lib/errors.ts`.
- **Exception:** `lookup_household` and `join_household` return `{ error: 'NOT_FOUND' | 'RATE_LIMITED' }` instead of raising, so the rate-limit attempt row isn't rolled back.
- **New RPCs need explicit grants.** All functions are revoked from `public` and `anon`, so `grant execute ... to authenticated` each new one.
- **Check SQL without Docker** by parsing it with `libpg-query` (`parse` and `parsePlPgSQL`). If Docker is available, `npx supabase start` and `db reset` is better.

### Money and dates

- **Money is integer centavos** (`bigint`, `*_cents`). Convert only for display: `fmtCents`, `centsToInput`, and `inputToCents` in `src/lib/format.ts`. Never use floats for amounts.
- **Months are `"YYYY-MM"` keys in the user's local time.**
  - The server doesn't know the user's month, which is why `/tracker` without a month resolves on the client.
  - Use the helpers in `format.ts`, not `new Date(string)` parsing.
- **Status is derived, never stored** (`statusOf`, PRD §4.5).

### Realtime and concurrency (PRD §6.6)

- **Use the one channel per household** in `TrackerApp.tsx`. Don't open more.
- **Realtime `DELETE` events are unfiltered and carry only the primary key** under RLS. Match them by `id`.
- **Before deleting**, call `announceDelete` so other members can show "deleted by {member}".
- **Writes are optimistic:**
  - Apply the change locally, then roll back on error.
  - Record your own saves with `markOwn` so their realtime echoes are ignored.
- **Updates to expenses and categories must keep the optimistic-concurrency guard** `.eq('updated_at', original.updated_at)`, and treat zero updated rows as a conflict.

### UI

- **Dialogs use `<Modal>`**, never `alert` or `confirm`. It provides `role="dialog"`, Esc and backdrop close, a focus trap, and focus return.
- **Toasts use `useToast()`.**
- **Copy:** user-facing text follows the PRD wording. The household model is fixed:
  - Each user belongs to one household.
  - All members have equal permissions.
  - The owner can't leave.
- **Don't add UI for out-of-scope features** (PRD §1.2):
  - transferring ownership
  - deleting a household
  - removing members
  - deleting trackers
- **No prototype scaffolding** (PRD §10): no sample data, no "view as" switcher, and no fake delays.
- **localStorage** holds only UI preferences: theme (`finance-tracker-theme`), view, and split width. Wrap every access in `try/catch`.

### Styling

- **Design tokens are CSS variables** on `:root` in `globals.css`, flipped for light mode by `data-theme` or `prefers-color-scheme`.
  - Use the variables, or the Tailwind colors mapped to them (`bg-surface`, `text-muted`, `border-line`, …).
  - Don't hard-code hex colors, except the category palette (`PALETTE`) and the logo gradient.
- **Page-specific CSS is scoped** under `.pg-landing`, `.pg-onboarding`, and `.pg-tracker`.
  - Dialog styles stay global because dialogs render in a portal.
- **Mobile is required:**
  - no horizontal scroll from 360px up
  - tables stack below 640px
  - dialogs become bottom sheets
  - form inputs are 16px
  - touch targets are at least 40px
- **Respect `prefers-reduced-motion`.**

## Git

- Branch off `main` for changes. Don't commit or push unless asked.
- Commit messages: imperative subject, then a short body explaining what changed and why.
