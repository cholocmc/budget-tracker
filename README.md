# Monthly Budget Tracker

A shared household budgeting app built from [docs/PRD.md](docs/PRD.md). It uses Next.js 16 (App Router, TypeScript), Tailwind CSS, and Supabase (Google auth, Postgres with RLS, and Realtime).

## Setup

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com). Then go to **Project Settings → API** and copy:

- the **Project URL**
- the **anon / publishable key**

### 2. Apply the database migration

The schema, RLS policies, triggers, RPCs, and the realtime publication are all in [supabase/migrations](supabase/migrations). Use either option:

```bash
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase db push
```

Or paste each file in `supabase/migrations/` into **SQL Editor** and run them in filename order, starting with `20261110000000_init.sql`. When new migrations are added later, run only the new ones.

### 3. Set up Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** of type **Web application**.
   - **Authorized JavaScript origins:** `http://localhost:3000`, plus your production URL.
   - **Authorized redirect URIs:** `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
2. In Supabase, go to **Authentication → Sign In / Providers → Google**. Turn it on and paste the client ID and secret.
3. In Supabase, go to **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:3000` (your production URL later)
   - **Redirect URLs:** `http://localhost:3000/auth/callback`, plus `https://YOUR-DOMAIN/auth/callback`

### 4. Environment variables

```bash
cp .env.example .env.local
```

| Variable | Required | What it is |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL from step 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | anon / publishable key from step 1 |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | no | The OAuth client ID from step 3 |

`NEXT_PUBLIC_GOOGLE_CLIENT_ID` controls which sign-in button the app shows:

- **When set:** the landing page shows Google's official "Sign in with Google" button (Google Identity Services) and signs in with `signInWithIdToken`. This is what PRD §6.1 asks for in production. For it to work, also add the same client ID to **Authorized Client IDs** in the Supabase Google provider settings.
- **When empty:** the app uses the Supabase OAuth redirect (`signInWithOAuth` → `/auth/callback`) behind the prototype's button.

### 5. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | Runs the TypeScript checks |
| `npm run db:types` | Generates database types from a local Supabase stack into `src/lib/database.types.ts` (needs Docker) |

## How it's put together

| Path | What's there |
|---|---|
| `src/proxy.ts` | Refreshes the session and enforces the routing rules in PRD §2 (Next 16 renamed `middleware` to `proxy`). |
| `src/app/page.tsx` | Landing page |
| `src/app/onboarding` | Create or join a household |
| `src/app/tracker/[[...month]]` | Tracker page: `/tracker` (current local month) and `/tracker/YYYY-MM` |
| `src/app/auth/callback` | OAuth code exchange |
| `src/app/signed-out` | "You're signed out" screen |
| `src/components/tracker` | Tracker client app: state store, realtime sync, sections, dialogs |
| `src/app/globals.css` | Design tokens (PRD §9.2) and component styles ported from the prototypes. Tailwind maps the tokens in `tailwind.config.ts`. |

### Notes on the implementation

- **Money** is stored as integer centavos (`bigint`) and only formatted as ₱ for display.
- **Live sync:** there is one Realtime channel per household.
  - `DELETE` events can't be filtered by column, and under RLS they carry only the primary key, so the client matches them by id.
  - Members send a small broadcast before deleting something, so other members can see who deleted it ("deleted by {member}").
- **Edit conflicts:**
  - Expense and category saves include `.eq('updated_at', original)`. If another member changed the row first, the save is rejected.
  - Open dialogs show a "{member} just updated this" notice with **Load latest**.
- **Additions to the PRD schema:**
  - `categories.updated_by`, so the category conflict notice can name the member.
  - `code_lookup_attempts.ip`, for per-IP rate limiting.
- **Rate limiting:**
  - `lookup_household` and failed `join_household` attempts are limited to 10 per user and 30 per IP every 10 minutes.
  - The IP comes from the `x-forwarded-for` header that Supabase passes to Postgres. Treat the per-IP limit as best effort.
- **`NOT_FOUND` and `RATE_LIMITED`** from `lookup_household` and `join_household` come back as `{ error }` values instead of exceptions. An exception would roll back the attempt row that the rate limit counts.
