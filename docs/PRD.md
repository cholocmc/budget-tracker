# PRD: Budget Mate

**Owner:** Cholo (CholoCMC)
**Status:** Ready for build. All three pages are designed and prototyped. All questions are resolved (§11).
**Stack:** Next.js + Tailwind CSS (frontend), Supabase (auth, Postgres, realtime)
**Last updated:** November 14, 2026

---

## 1. Overview

Budget Mate is a shared household budgeting web app. A household keeps one tracker per month. Each tracker holds expenses grouped into categories. For each expense, members record the **budgeted** amount and the **actual** amount, and the app shows the gap per category and for the whole month.

Users sign in with Google. Each user belongs to exactly one household. They either create a household or join an existing one with a household code. Every member of a household has the same permissions.

### 1.1 Goals
- Plan a month's spending by category and see budget vs. actual at a glance.
- Make recurring monthly expenses (bills, insurance) quick to carry forward.
- Let a household (partners, family) manage one shared budget with no permission friction.
- Work well on phones and desktops, in light and dark mode.

### 1.2 Non-goals (v1)
- Bank syncing, receipt scanning, or automatic transaction import.
- Multiple currencies (v1 is Philippine Peso only).
- Income tracking, savings goals, or forecasting.
- Roles beyond Owner and Member, or per-member permissions.
- Native mobile apps (a responsive web app only).
- Transferring ownership of a household.
- Removing another member from a household. Members can only leave on their own.
- Expiring household codes, or limiting how many times a code can be used.

### 1.3 Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js** (App Router, TypeScript) | Server Components for the initial data load; Client Components for interactive parts (dialogs, chart, realtime). |
| Styling | **Tailwind CSS** | Map the design tokens in §9.2 to CSS variables and reference them from `tailwind.config` (e.g. `bg-surface`, `text-muted`, `border-line`). Dark mode uses the `class` strategy on `<html>` with `data-theme`, following the rules in §6.4. Load the fonts with `next/font/google`. |
| Auth | **Supabase Auth**, Google provider | Use `@supabase/ssr` for cookie-based sessions in Next.js. Middleware handles route protection and redirects (§2). |
| Database | **Supabase Postgres** | Row Level Security on every table (§5.2). Multi-step operations run as Postgres functions called with `supabase.rpc()` so they're atomic (§8). |
| Live sync | **Supabase Realtime** (`postgres_changes`) | Required. Changes from other members appear without a refresh (§6.6). |
| Charts | Hand-built SVG | The nested pie is simple arc math (as in the prototype). No chart library needed. |
| Hosting | Vercel (suggested) | Any Next.js host works. |

---

## 2. Pages and user flow

```
Landing page ──(Continue with Google)──► Google OAuth
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     │ User already in a household?                │
                     ▼ yes                                         ▼ no
               Tracker page  ◄──── create / join ──────────  Onboarding page
                     │
     ┌───────────────┼─────────────────────┐
     ▼               ▼                     ▼
  Sign out      Leave household        (stay)
     │          (members only)
     ▼               ▼
 Signed-out     "You left" screen ──► Onboarding (create or join)
 screen ──► Landing
```

Routing rules:
- An unauthenticated visitor to any app route is redirected to the landing page.
- `/profile` (§6.7) is open to every signed-in user, with or without a household. It's reached from the account menu in the tracker header.
- An authenticated user with no household always lands on onboarding.
- An authenticated user with a household who opens onboarding or the landing page is redirected to the tracker.

---

## 3. Glossary

| Term | Meaning |
|---|---|
| **Household** | The shared workspace (called "instance" early in the discussion). It has a name, an owner, members, a household code, categories, and monthly trackers. |
| **Owner** | The user who created the household. |
| **Member** | Any user in a household. The owner is also a member. |
| **Household code** | A unique, shareable code (format `XXXX-XXXX`) that lets a person join a household. |
| **Monthly tracker** | The container for one month's expenses in a household. It is identified by year and month. |
| **Category** | A household-wide grouping for expenses, such as Bills, Insurance, or Medicine. Categories are shared across all months. |
| **Expense** | One line item in a monthly tracker. |
| **Account** | A bank or e-wallet on a user's profile, with its current balance (§6.7). Accounts belong to the user, not the household, and only that user can see them. |

---

## 4. Business rules (source of truth)

### 4.1 Households and membership
1. **A user can belong to at most one household at a time.**
   - A user already in a household cannot create a new household.
   - A user already in a household cannot join another one. The server must enforce this, not only the UI.
   - To switch households, a user must first leave their current one.
2. **All members have full permissions.** Any member can:
   - create, edit, and delete categories, expenses, and trackers
   - rename the household
   - view and copy the household code
   - reset the household code
3. **The owner cannot leave the household.** Only non-owners see "Leave household". In v1 there is no ownership transfer, so the owner stays in the household until they delete it (rule 6).
   - **Not available in v1:** transferring ownership and removing another member. Don't build UI for these.
4. **Leaving a household:**
   - It needs a confirmation dialog.
   - Access ends immediately.
   - Every expense owned by the leaving member, in all months, is **reassigned to the household owner**. Nothing is deleted.
   - Coming back requires the household code, which may have been reset in the meantime.
   - After leaving, the user sees a "You left {household}" screen with **Create a household** and **Join with a code**, both of which go to onboarding.
6. **Household name rules:**
   - On creation: required, trimmed, 2–50 characters.
   - On rename: required, trimmed, at most 50 characters. If the name is unchanged, nothing is saved.
6. **Deleting a household (owner only):**
   - Only the owner sees it, in Settings → "Household" (§6.3.1). It needs a typed confirmation of the household name.
   - It is **irreversible** and deletes the household with every member's membership, every category, every monthly tracker, and every expense.
   - Every member, the owner included, ends up with no household. The owner sees a "You deleted {household}" screen; other members see "{owner} deleted {household}" live. Both screens offer **Create a household** and **Join with a code**, which go to onboarding.

### 4.2 Household code
1. The format is `XXXX-XXXX`: 8 characters plus a hyphen.
2. The character set is `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. It deliberately leaves out **0, O, 1, I** so codes are easy to read aloud and type.
3. Codes must be cryptographically random and unique across all households.
4. A code is generated when the household is created and stays the same until someone resets it.
5. **Reset code:**
   - Any member can reset it.
   - It needs a second confirming click ("Reset code" → "Confirm reset").
   - The old code stops working immediately. Current members are not affected.
6. **Codes never expire** and have no usage limit. Resetting is the only way to stop a code from working.

### 4.3 Monthly trackers
1. A tracker is identified by `(household, year, month)` and is unique per household.
2. The tracker page always opens on the **current month and year**, in the user's local time zone.
3. If the selected month has no tracker, the page shows an empty state with **"Create {Month Year} tracker"**.
4. **Copy from a previous month when creating a tracker:**
   - The source is the **most recent earlier month that has at least one expense**. Usually that's the previous month; gaps are skipped.
   - If there is no such month, the tracker is created immediately with no dialog.
   - If there is one, the copy dialog opens. Its behaviour is in §6.3.4.
5. Trackers can be navigated with previous/next arrows, a month picker, and chips for months that already have trackers.
6. **Any member can delete a month's tracker** (Settings → "This month", §6.3.1). It deletes every expense in that month for the whole household, after the user types the month label to confirm. Categories and other months stay. The month then shows its empty state again, so it can be recreated empty or copied from an earlier month (rule 4).

### 4.4 Categories
1. **Categories belong to the household and are shared across all months.** They are not per-tracker.
2. **Name:** required, trimmed, at most 40 characters. It must be **unique within the household, ignoring case**. If it isn't, show: `"{name}" already exists. Pick a different name.`
3. **Color:** one of a 16-color palette (§9.3). New categories default to the first palette color not already used.
4. **Editing a category:**
   - Expenses reference categories by ID, so a rename or color change shows up on every expense in every month.
   - The edit dialog tells the user how many expenses will be affected.
5. **Deleting a category:**
   - It is **irreversible** and **cascades**: every expense in that category, in **all months**, is deleted.
   - It needs a confirmation dialog that:
     - shows the number of expenses, the number of months affected, and the total budgeted and spent amounts being deleted
     - only enables the delete button once the user types the **exact category name**
   - If the category has no expenses, the dialog says so and still asks for confirmation.
   - If the deleted category was the active expense filter, the filter resets to "All categories".
6. An expense cannot be created while the household has no categories. The "Add expense" button is disabled and shows the hint "Add a category first".

### 4.5 Expenses

| Field | Rules |
|---|---|
| **Name** | Required, trimmed, at most 60 characters. *Not in the original spec. It was added so items within a category can be told apart.* |
| **Category** | Required. Must be a household category. |
| **Budgeted amount** | Number ≥ 0, at most 2 decimals. A blank field saves as 0. |
| **Actual amount** | Number ≥ 0, at most 2 decimals. A blank field saves as 0. |
| **Owner** | Required. Must be a current household member. Defaults to the **current user**. |
| **Due date** | Required. Must fall **within the tracker's month**. Defaults to today if today is in that month, otherwise to the 1st of the month. |

- **Deleting an expense** uses a simple confirmation dialog. Typing the name is not required.
- **Remaining** = budgeted − actual. It can be negative.

**Derived status.** Status is never stored. Evaluate the rules in this order:

| # | Condition | Status | Color |
|---|---|---|---|
| 1 | actual > budgeted | **Over budget** | danger |
| 2 | budgeted > 0 and actual ≥ budgeted | **Settled** | accent |
| 3 | actual > 0 | **Partly paid** | warning |
| 4 | actual = 0 and due date < today | **Overdue** | danger |
| 5 | otherwise | **Upcoming** | muted |

### 4.6 Money
- The currency is **PHP (₱) only**. There is no currency setting in v1. Display amounts with `Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })` and always show 2 decimals.
- Store money as **integer centavos** (or a fixed-point decimal), never as a float.
- Money input fields behave as described in §6.3.6.

---

## 5. Data model (Supabase Postgres)

### 5.1 Tables

Users are Supabase Auth users (`auth.users`). A `profiles` row is created for each new user by a trigger on `auth.users`, copying the name and avatar from their Google profile.

```sql
-- One row per signed-in user, filled from Google profile data.
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create table households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 50),
  code       text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'),
  owner_id   uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- UNIQUE(user_id) is the database guarantee of "one household per user".
create table household_members (
  user_id      uuid primary key references profiles(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  role         text not null check (role in ('owner','member')),
  joined_at    timestamptz not null default now()
);
create index on household_members (household_id);

create table categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 40),
  color        text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index categories_household_name_ci on categories (household_id, lower(name));

create table trackers (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  year         int  not null check (year between 2000 and 2100),
  month        int  not null check (month between 1 and 12),
  created_at   timestamptz not null default now(),
  unique (household_id, year, month)
);

create table expenses (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade, -- denormalized for RLS and realtime filters
  tracker_id     uuid not null references trackers(id) on delete cascade,
  category_id    uuid not null references categories(id) on delete cascade,   -- deleting a category deletes its expenses
  name           text not null check (char_length(btrim(name)) between 1 and 60),
  budgeted_cents bigint not null default 0 check (budgeted_cents >= 0),
  actual_cents   bigint not null default 0 check (actual_cents >= 0),
  owner_id       uuid not null references profiles(id),
  due_date       date not null,
  created_by     uuid references profiles(id),
  updated_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on expenses (tracker_id);
create index on expenses (household_id);
create index on expenses (category_id);
```

```sql
-- Profile accounts (§6.7). Owned by the user, not the household, so household and tracker
-- deletions never touch them.
create table bank_accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 40),
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  color         text not null,  -- one of the §9.3 palette
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index bank_accounts_user_name_ci on bank_accounts (user_id, lower(name));
```

Triggers to add:
- `updated_at` is set to `now()` on every update of `households`, `categories`, `expenses`, and `bank_accounts`.
- `expenses`:
  - Before insert or update, check that `due_date` falls within the tracker's year and month.
  - Check that `household_id` matches the tracker's household and the category's household.
  - Check that `owner_id` is a current member of that household.
  - Set `updated_by` to `auth.uid()`.
- `auth.users` after insert: create the matching `profiles` row from `raw_user_meta_data` (`full_name` or `name`, and `avatar_url`).

Money is stored as **integer centavos** (`bigint`). Convert to pesos only for display.

### 5.2 Row Level Security

Turn on RLS for **every** table. Add a `security definer` helper function:

```sql
create function my_household_id() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from household_members where user_id = auth.uid()
$$;
```

| Table | select | insert / update / delete |
|---|---|---|
| `profiles` | Your own row, plus rows of people in your household | Update your own row only |
| `households` | `id = my_household_id()` | Update `name` only when `id = my_household_id()`. Create, code changes, and membership changes go **only through RPCs** (§8). |
| `household_members` | `household_id = my_household_id()` | None directly. Use RPCs only. |
| `categories` | `household_id = my_household_id()` | Same condition, for all members |
| `trackers` | `household_id = my_household_id()` | Insert through `create_tracker` and delete through `delete_tracker` only. No update. |
| `expenses` | `household_id = my_household_id()` | Same condition, for all members |
| `bank_accounts` | `user_id = auth.uid()` | Same condition. Only the owner of a row can see or change it, household members included. `user_id` can't be updated. |

The household `code` column must only be readable by members. The lookup for people joining goes through the `lookup_household` RPC, which returns the name, owner, and members but never lists codes.

### 5.3 Client-side preferences

These are stored per browser in localStorage, not in Supabase:
- theme (key `finance-tracker-theme`)
- table/list view
- the chart/summary split width
- the order of the tracker's sections (key `finance-tracker-rows`, §6.3.1)

---

## 6. Feature specs

### 6.1 Landing page

**Purpose:** a sleek marketing page with Google sign-in.

**Sections:**
1. **Nav:**
   - Logo and the name "Budget Mate" on the left.
   - On the right: the light mode switch and a "Sign in →" link that scrolls to the sign-in button.
2. **Hero:**
   - Eyebrow: "Shared household budgeting".
   - Headline: "Plan every peso. See where it went." The second sentence uses a gradient.
   - Lede: "Set a budget for each category, log what you actually spend, and see the gap every month. Your whole household works in the same tracker, so bills and due dates never fall through the cracks."
   - **Continue with Google** button.
   - Fine print: "Start your own household, or join one with a household code."
   - A **preview card** on the right showing:
     - the current month name and an "Example data" tag
     - the nested budget-vs-actual chart with a gentle settle-in animation
     - a legend with actual / budgeted amounts per category
     - three KPI tiles: Budgeted, Actual, Remaining
3. **Features ("What you can do")**, six cards:
   - A tracker for every month: copy recurring bills from last month; due dates carry over to the same day.
   - Categories that follow you: rename once and every expense updates; deletes ask you to confirm first.
   - Expenses with owners and due dates: settled / partly paid / overdue at a glance; amounts formatted as you type.
   - Budget vs actual, in one chart: category summary with remaining totals; overspending shows in red.
   - Table or list, your call: sort by category, owner, due date, or amount; filter to a single category.
   - One household, shared: share your household code; every member can add, edit, and delete; each person belongs to one household; works on phone and desktop, light or dark.
4. **Private profile**, between the features and the steps:
   - Eyebrow "Your private profile", heading "Every account, one total", and the copy "Keep the balance of each bank and e-wallet you use on your own profile, and see your total across all of them. Update a balance with one tap whenever it changes."
   - Three points: "Only you can see it. Other household members can't.", "See each account's share of your total", "Separate from your household's budget".
   - A **profile preview card** beside the copy (stacked under it below 960px), tagged "Example data": the total balance, the distribution bar, five example accounts with their share bars and balances, and "Only you can see your accounts." The example accounts are made up, never a real user's data.
5. **Getting started**, three numbered steps:
   1. **Sign in with Google**: no new password to remember.
   2. **Create or join a household**: start a new household and share its code with the people who split your bills. Got a code from someone? Enter it to join their household instead.
   3. **Plan the month**: add categories and expenses, log payments as they happen, and next month copy the recurring ones over.
6. **Closing band:** "Your first tracker opens on {current Month Year}", followed by a second **Continue with Google** button.
7. **Footer:** see §6.5.

**Google button:**
- In production, use **Google Identity Services' official "Sign in with Google" button**. The prototype uses a neutral icon on purpose, so as not to reproduce Google's logo by hand.
- Show a loading state while authenticating.

### 6.2 Onboarding page

**Shown to:** authenticated users with no household.

**Layout:**
- **Top bar:**
  - Logo and name.
  - A "Signed in with Google" chip with **Sign out**. On phones, the chip text is hidden and only Sign out shows.
  - Light mode switch.
- **Centered card** with a two-step progress indicator: ✓ Signed in → 2 Household.
- Title "Set up your household", then two **choice tiles** that act as a radio group:
  - **Create a household**: "You'll be the owner and get a code to share."
  - **Join with a code**: "Paste the household code a member sent you."
  - Arrow keys switch between tiles, and focus moves to the chosen form's input.
- A rule note at the bottom: "You can belong to one household at a time. To switch later, leave your current household first."

**Create flow:**
1. A single field, **Household name**, with the hint "Every member sees this name. You can change it later."
2. Validation: 2–50 characters after trimming. Error: "Enter a household name with at least 2 characters."
3. The submit button shows a loading state ("Creating…"). The server then:
   - creates the household with the user as owner
   - generates the household code
   - creates the membership
4. The **success screen** shows:
   - "{name} is ready"
   - "Your first tracker opens on {Month Year}"
   - the household code in large text, with a **Copy code** button
   - **Open my tracker →**
   - a hint that the code can be found again under Invite.

**Join flow:**
1. A **Household code** field (monospace, centered, letter-spaced):
   - Uppercase the input and strip any character that isn't A–Z or 0–9.
   - Insert the hyphen automatically after 4 characters. Allow at most 8 characters.
   - Normalize pasted text the same way.
   - Hint: "8 characters. Ask any member for it. It's under Invite in their tracker."
2. Validation, in this order:
   - Not 8 characters → "Household codes have 8 characters, like K7QM-XR4D."
   - Contains 0, O, 1, or I → "Codes never use 0, O, 1, or I. Double-check those characters with the person who sent it."
   - No household has this code → "No household uses this code. It may have been reset, so ask a member for the latest one."
3. **Confirmation step.** Do not join immediately on a match. Show a "Join this household?" card with:
   - the code
   - the household name
   - member avatars, the member count, and "Owned by {owner}"
   - the note "As a member you can view, add, edit, and delete everything in this household's trackers."
   - buttons: **Use a different code** and **Join {name}**.
4. On join:
   - The server re-checks that the code is still valid and that the user is not in another household.
   - It creates the membership with the `member` role.
   - The success screen shows "You joined {name}" and **Open my tracker →**.

**Rate limiting:** the code lookup endpoint must be rate-limited per user and per IP, to prevent brute-forcing codes.

### 6.3 Tracker page (main app)

#### 6.3.1 Header
- **Household name** with a pencil button that opens the **Rename household** dialog. Long names wrap.
- Subtitle: "Budget tracker · {N} member(s)".
- **Member avatars** (initials on a colored circle). The whole avatar group is a button that opens the **Members** dialog.
- **Invite** button, which opens the household code dialog.
- **Light mode** switch.
- **Settings** button (gear icon), which opens the **Settings** dialog.
- **Account menu**: your own avatar, at the right end of the row. It opens a menu with your name, **Profile** (goes to `/profile`, §6.7), and **Sign out**. Esc or a click outside closes it, and arrow keys move between the items.
- The member avatar group shows the **other** members, since your own avatar is the account menu. When you're the only member, the group is hidden.
- On phones, the button labels are hidden and only icons show; the controls stay on one row.

**Settings dialog:**
- "Section order": lists the four sections below the header in their current order, each with its name, a one-line description, and move up / move down buttons (disabled at the ends):
  1. **Month** (month switcher and Add expense)
  2. **Month totals** (Budgeted, Actual spent, Remaining)
  3. **Budget vs actual and Category summary**
  4. **Expenses**
- Note: "Arrange the tracker's sections. This only changes the layout on this device."
- **Reset to default** restores the order above. **Cancel** discards changes; **Save** applies the new order and stores it in localStorage (§5.3).
- When a month has no tracker, the empty-month card takes the place of the first non-Month section.
- "This month" (only when the viewed month has a tracker): a red section "Delete the {Month Year} tracker" with a **Delete tracker** button that opens the delete confirmation:
  - Title "Delete the {Month Year} tracker?". A warning box: "This can't be undone." plus the month's expense count, budgeted and spent totals, and that categories and other months stay.
  - The user must type the month label (for example "November 2026", case-insensitive) to enable **Delete tracker**. **Keep tracker** cancels.
  - Toast: "Deleted the {Month Year} tracker and N expenses".
- "Household" (**owner only**): a red section "Delete {household}" with a **Delete household** button that opens the delete confirmation (§4.1 rule 6):
  - Title "Delete {household}?". A warning box: "Are you really sure? Deleting your household would put you and all the members back to onboarding, so you either have to create a new household or join another one." (without "and all the members" when the owner is alone), plus "This can't be undone." and how many monthly trackers go with it.
  - The user must type the household name (case-insensitive) to enable **Delete household**. **Keep household** cancels.

**Members dialog:**
- Lists every member with their name, a "(you)" marker for the current user, and their role (Owner or Member).
- **Non-owners** see a red "Leave household" section with a **Leave household** button.
- The **owner** sees "You own this household, so you can't leave it."

**Leave confirmation dialog:**
- Title "Leave {name}?" with a warning: "You'll lose access right away. To come back, you'll need the household code from a member."
- Then one of:
  - If the user owns expenses: "The {N} expense(s) you own will stay in the household and move to {owner}, the owner."
  - Otherwise: "You don't own any expenses, so nothing else in the household changes."
- Buttons: **Stay** and **Leave household** (danger).

**Invite dialog:**
- Explains: "Share this household code. New members enter it when they sign up to join your household. Every member can add, edit, and delete anything."
- Shows the code in large monospace accent text. The code can be selected.
- **Copy code**:
  - Calls `navigator.clipboard.writeText`, then shows "Copied" and a toast.
  - If the clipboard isn't available, it selects the code text and tells the user to copy it manually.
- **Reset code** uses the two-click confirmation from §4.2.
- Note: "Someone who already belongs to another household can't use this code until they leave it."
- The member list is shown below.

**Sign out** (from the account menu):
- Ends the session.
- Shows a "You're signed out" screen: "Your household and its trackers are saved. Sign in with Google again to pick up where you left off." It has a link to the landing page.

#### 6.3.2 Month rail
- Previous and next arrows.
- A large label with the eyebrow "Monthly tracker" above "{Month Year}".
- Chips for every month that has a tracker, sorted by date, with the current one highlighted.
- A native `<input type="month">` to jump to any month.
- On phones, the chips sit in one horizontally scrolling row.

#### 6.3.3 Empty month state
- "Start the {Month Year} tracker", with copy that depends on whether categories exist:
  - "Your N categories are shared across months, so you can start adding expenses right away."
  - or "Create a tracker for this month, then add categories and expenses."
- If there is a month to copy from, add the hint "You can copy recurring expenses from {Month Year} in the next step."

#### 6.3.4 Copy-expenses dialog (on tracker creation)
- Title "Copy expenses from {source Month Year}?". Subtitle: "Pick the recurring expenses to bring into {Month Year}. Due dates move to the same day this month."
- A header line showing the number of categories and expenses, plus **Select all** and **Clear** links.
- A scrollable list **grouped by category**:
  - Each category row has a checkbox, its color swatch, its name, its expense count, and its budgeted total. The checkbox is **tri-state**: checked, unchecked, or indeterminate when only some of its expenses are selected. When only some are selected, the count reads "{selected} of {N}".
  - Each category row ends with a **chevron button** that shows or hides its expenses. Categories start **collapsed**, unless there is only one category, which starts expanded.
  - Each expense row has a checkbox, its name, its budgeted amount, and its due date **as it will be in the new month**.
  - Everything is selected by default.
- Checkbox **"Also copy actual amounts"**, **off by default**. Hint: "Leave this off to start each copied expense at ₱0.00 spent."
- Buttons:
  - **Start empty** creates an empty tracker.
  - The primary button has a live label: "Create with N expense(s)", or "Create empty tracker" when nothing is selected.
- Closing or dismissing the dialog **creates nothing**.
- How each copied expense is built:
  - New ID.
  - The same name, category, and budgeted amount.
  - Actual amount is 0, unless "also copy actual" is checked.
  - The same owner if that person is still a member; otherwise the household owner.
  - The due date's day of month moves to the new month and is **clamped to the month's last day**. For example, Jan 31 becomes Feb 28 or 29.

#### 6.3.5 Totals and summary
- **KPI row** with three tiles:
  1. **Budgeted:** the total, with "N expenses across M categories".
  2. **Actual spent:** the total, a progress meter of actual ÷ budgeted (capped at 100% visually, red when over), and "X.X% of budget used".
  3. **Remaining:** the total in accent color. When negative it turns red and says "Over budget this month".
  - On phones, the tiles show as 2 + 1. Below 380px they stack into one column.
- **Budget vs actual chart** (card):
  - A nested pie:
    - The **outer ring** shows each category's share of the **budgeted** total.
    - The **inner pie** shows each category's share of the **actual** total.
    - Each ring is 100% of its own total.
    - Categories with 0 in a ring are left out of that ring.
    - If a ring's total is 0, it shows a dashed placeholder.
  - The same category colors are used everywhere.
  - A key reads "Outer ring: budgeted · Inner pie: actual".
  - **Legend:** for each category, a swatch and its name on the first line, then "Budget X.X% · Actual Y.Y%" on a second line. The legend flows into as many columns as fit.
  - **Interaction:** hovering, tapping, or keyboard-focusing a slice or legend row highlights that category (other slices dim) and updates a readout with the category's budgeted and actual amounts and percentages.
  - **Responsive:** the layout depends on the card's own width (container query), not the screen width. Below 560px the legend sits under the chart; above that, beside it.
- **Category summary** (card):
  - A table with columns Category (swatch, name, and expense count for this month), Budgeted, Actual, Remaining (red when negative), and edit/delete actions.
  - It lists **all** household categories, including ones with no expenses this month.
  - A totals row at the bottom; total Remaining shows in accent color, or red when negative.
  - The **Add category** button is in the card header.
- **Resizable split** between the chart card and the summary card (desktop only, ≥ 900px):
  - A vertical grip between the cards that highlights on hover.
  - Dragging sets the chart card's width between **28% and 70%**. The default is **42%**.
  - Keyboard: left/right arrows move it 2%, Shift+arrow 10%, Home/End jump to the limits. The grip uses `role="separator"` with `aria-valuenow`.
  - Double-click resets to the default.
  - The width is saved per user on the client.
  - Below 900px the cards stack and the grip is hidden.

#### 6.3.6 Expenses section
- **Toolbar:**
  - A category filter (All categories, or one category).
  - A **Table / List** toggle. The choice is saved; the first-time default is List below 700px and Table otherwise.
  - **Add expense** (disabled when there are no categories).
  - On phones in table view, a **Sort** dropdown (see below).
- **Table view:**
  - Columns: Expense, Category, Owner (avatar plus "You" or the member's name), Due ("Nov 15"), Created (the date the expense was added, in local time, "Nov 3"), Budgeted, Actual, Remaining, Status pill, and edit/delete actions.
  - **Sortable columns:** Category, Owner, Due, Created, Budgeted, Actual, Remaining.
    - Clicking a header sorts by it; clicking the same header again reverses the order.
    - The first click on a text or due-date column sorts ascending (A–Z, earliest first). The first click on a money column sorts **descending** (highest first), and the first click on Created sorts **newest first**.
    - The active column is highlighted with an ↑ or ↓ arrow and has `aria-sort`.
    - Ties are broken by due date, ascending.
    - The default is **Created, newest first**.
  - **On phones**, the table becomes stacked cards with labeled rows, and the headers are hidden. Sorting moves to a dropdown in the toolbar with options like "Budgeted: highest first" and "Due date: earliest first".
- **List view:**
  - Expenses are grouped by category. Each group header shows a swatch, the name, and "{actual} of {budgeted}".
  - Each item shows its name, "Due {date}", its owner, its status pill, its actual amount, "of {budgeted} · {remaining} left / over by {x}", a progress bar (red when over), and edit/delete actions.
  - Items within a group follow the current sort.
- **Empty states:**
  - No categories: "Expenses live inside categories. Add a category first…"
  - No expenses in the current view: "No expenses (in this category) yet." with an Add expense button.

**Expense dialog (add and edit):**
- Fields: Expense name, Category (select), Owner (select of members; the current user is labeled "(you)"), Budgeted, Actual, Due date.
- The due date input is limited to the tracker's month with `min`/`max`, and is also validated on submit.
- If the category filter is active, the new expense defaults to that category.
- **Money inputs:**
  - Use a text input with `inputmode="decimal"` and a ₱ prefix inside the field.
  - Add thousands separators **while typing** and keep the cursor in place.
  - Allow only digits and one decimal point, with at most 2 decimal places. Strip leading zeros. Allow at most 12 integer digits.
  - When the field loses focus, format it to 2 decimals (`25,000` becomes `25,000.00`).
  - Existing values open already formatted.
- Error messages:
  - "Enter a name for this expense."
  - "Amounts must be zero or more."
  - "Pick a due date."
  - "Pick a due date in {Month Year}."

**Category dialog (add and edit):**
- Name and color swatches.
- Editing shows "Categories are shared across all months. Changes apply to all N expenses in this category."
- Adding shows "The new category appears in every month."

#### 6.3.7 Toasts
- Every create, update, or delete shows a short toast confirming what happened. Examples:
  - "Added Meralco electricity"
  - "Deleted Bills and 4 expenses"
  - "Created December 2026 with 7 copied expenses"
  - "Household code copied"
  - "Renamed to Santos Family"

### 6.4 Light / dark mode
- The design is dark-first. Light mode is fully designed, not just inverted.
- Until the user flips the switch, the app follows the system setting (`prefers-color-scheme`). After that it remembers the user's choice.
- Store the choice under one shared key (for example `finance-tracker-theme`) so the landing, onboarding, and tracker pages always match.
- The switch is `role="switch"` with `aria-checked` (true means light). The thumb shows a sun or a moon.

### 6.5 Footer (all pages)
- The text is "Made by **CholoCMC**".
- **CholoCMC** links to `https://www.cholocmc.com` and opens in a new tab (`target="_blank" rel="noopener"`).

### 6.6 Live sync (required)

Any change made by one member must appear for every other member who has the tracker open, without a refresh. This matters most for households with several people.

**Subscription:**
- Add `households`, `household_members`, `categories`, `trackers`, and `expenses` to the `supabase_realtime` publication.
- In the tracker page, open **one channel per household** with `postgres_changes` listeners filtered by `household_id=eq.{id}` (`id=eq.{id}` for `households`), for `INSERT`, `UPDATE`, and `DELETE`.
- RLS applies to realtime, so members only receive their own household's rows.
- Set `REPLICA IDENTITY FULL` on `expenses` and `categories`, so `DELETE` events include `household_id` and the row data.
- Subscribe when the page mounts. Unsubscribe when it unmounts or the user signs out.
- After the connection drops and comes back, **refetch the current month** so any events missed while offline are picked up.

**What each change does in the UI:**

| Event | UI behaviour |
|---|---|
| Expense added, edited, or deleted in the month being viewed | Update the KPIs, chart, summary, and table or list in place. Keep the current sort, filter, and scroll position. |
| Expense changed in a different month | Update cached data only; nothing visible changes. |
| Category added, renamed, or recolored | Update everywhere it appears: summary, legend, chart, filter, expense rows, and selects in open dialogs. |
| Category deleted | Remove it and its expenses. If it was the active filter, reset to All. Show a toast: "{name} was deleted by {member}". |
| Tracker created by someone else | Add it to the month chips. If the user is looking at that month's empty state, show the new tracker. |
| Tracker deleted by someone else | Remove it from the chips and drop its cached expenses. If the user is viewing that month, close any expense dialog and show the empty state. Toast: "The {Month Year} tracker was deleted by {member}". |
| Household renamed | Update the header. |
| Household code reset | If the Invite dialog is open, show the new code. |
| A member joins or leaves | Update the avatars, member count, Members dialog, and owner selects. If a departing member's expenses were reassigned, those rows update as well. |
| The current user's own membership is removed (they left from another device) | Show the "You left" screen (§4.1). |
| The owner deletes the household while others have it open | Close any open dialog and show "{owner} deleted {household}" (§4.1 rule 6), without a toast per deleted row. |

**Conflicts while editing:**
- When someone opens the edit dialog for an expense or category that another member then **changes**, show an inline notice in the dialog: "{member} just updated this. Review the latest values before saving." Also offer a **Load latest** button.
- When the item is **deleted** while its dialog is open, close the dialog and show a toast: "This expense was deleted by {member}."
- Saving uses **optimistic concurrency**: the update includes the `updated_at` value the user started from (`.eq('updated_at', original)`). If zero rows are updated, reject the save and show: "Someone else changed this expense. Review the latest version and try again."
- Your own changes are applied **optimistically**. If the server rejects one, undo it and show the error. Ignore realtime echoes of your own writes, matching them by row ID and `updated_at`.

**Optional, nice to have:** use Supabase Presence to show which members currently have the tracker open, for example a small green dot on their avatar.

---

### 6.7 Profile page (`/profile`)

A private page where each user keeps the balances of their banks and e-wallets. It is separate from the tracker: it doesn't feed any tracker numbers, and deleting a tracker, leaving a household, or deleting a household never changes it.

**Privacy:** only the signed-in user can see their accounts. Other members of their household can't (§5.2).

**Header:**
- A back button that goes to `/tracker` ("Back to tracker"), or to `/onboarding` when the user has no household.
- The logo, the title "Profile", and the subtitle "{household} · Budget tracker" ("Budget Mate" with no household).
- The light mode switch and a **Sign out** button.

**You card** (left column on desktop, on top on phones):
- Avatar, display name, and "Owner of {household}", "Member of {household}", or "Not in a household".
- **Total balance**: the sum of every account, with "Across N account(s) · last updated {when}".
- A distribution bar: one segment per account with a balance above zero, sized by its share of the total, in the account's color. Hovering an account row highlights its segment.
- A legend with the four largest accounts and their share ("42.1%"), plus "N others" for the rest.
- Note: "Only you can see your accounts. Other members of {household} can't." ("Nobody else can see your accounts." with no household).

**Accounts card:**
- Title "Accounts", subtitle "Banks and e-wallets you keep money in. Tap a balance to update it."
- A sort dropdown: **Highest balance** (default), **Name A–Z**, **Recently updated**. It isn't saved.
- **Add account** button (primary).
- Each row: a tile with the account's initials in its color, the name, "Updated {when}", a share bar with its percentage of the total, the balance, and edit/delete buttons.
  - "{when}" is "today", "yesterday", "N days ago" up to 13 days, then a date ("Nov 3"), in local time.
- **Updating a balance:** clicking the balance turns it into a money input in place, with Save (✓) and Cancel (×) buttons. Enter saves; Esc or Cancel restores it. An unchanged amount saves nothing. Toast: "Updated {name} to {amount}".
- **Empty state:** "No accounts yet" / "Add the banks and e-wallets you use to see your total balance in one place." with an **Add account** button.
- On phones each row takes two lines: tile, name, and balance on top; share bar and actions below.

**Account dialog (add and edit):**
- Title "Add account" or "Edit {name}".
- Fields:
  - Account name: required, trimmed, at most 40 characters, unique per user ignoring case.
  - Balance: a money input as in §6.3.6, zero or more. Blank means ₱0.00.
  - Color: the §9.3 swatches. New accounts take the first color the user's accounts don't already use.
- Errors: "Enter a name for this account.", "You already have an account called {name}.", "Amounts must be zero or more."
- Toasts: "Added {name}", "Saved {name}".

**Delete dialog:**
- Title "Delete {name}?". A warning box: "This can't be undone." then "{name} and its {balance} balance come off your profile. Your total goes from {total} to {new total}."
- Note: "This only removes it from Budget Mate. Nothing changes at your bank."
- Buttons: **Keep account** and **Delete account** (danger). Toast: "Deleted {name}".

**Saving:** writes are optimistic and roll back on error. Updates keep the `updated_at` guard; when no row matches, the list reloads with the message "This account changed in another tab. Showing the latest balance." This page has no live sync.

## 7. Edge cases checklist

| Area | Case | Expected behaviour |
|---|---|---|
| Membership | A user in a household tries to create or join another | Blocked by the server (unique membership) with a clear error. The UI never offers it. |
| Membership | The owner tries to leave | Not offered. The Members dialog explains why. |
| Membership | A member leaves while owning expenses | Their expenses in all months are reassigned to the owner, in one transaction. |
| Code | The code is reset while someone is mid-join | The join is re-validated on confirm and fails with "No household uses this code…". |
| Code | The user types lowercase, spaces, or a hyphen in the wrong place | Normalized to `XXXX-XXXX`. |
| Code | The user types 0, O, 1, or I | A specific error, not "not found". |
| Code | Brute-force attempts | Lookups are rate-limited. |
| Categories | A duplicate name with different case | Rejected. |
| Categories | Deleting a category used in several months | Every expense in every month is deleted. The dialog shows counts and totals, and the user must type the name. |
| Categories | Deleting the category that is the active filter | The filter resets to All. |
| Categories | No categories exist | Add expense is disabled, and the empty states guide the user. |
| Expenses | Blank amounts | Saved as 0. |
| Expenses | A due date outside the tracker month | Rejected. The input is also limited to the month. |
| Expenses | actual > budgeted | Status is "Over budget", and remaining is red. |
| Expenses | budgeted = 0 and actual = 0 | "Upcoming", or "Overdue" if the due date has passed. |
| Copy | No earlier month with expenses | No dialog; the tracker is created empty immediately. |
| Copy | A skipped month (e.g. Oct exists, Nov doesn't, creating Dec) | Copies from the most recent earlier month that has expenses. |
| Copy | The source due date is the 31st and the target month is shorter | Clamped to the target month's last day. |
| Copy | The source owner is no longer a member | The copy is assigned to the household owner. |
| Copy | The dialog is dismissed | Nothing is created. |
| Chart | All budgeted amounts or all actual amounts are 0 | That ring shows a dashed placeholder. |
| Chart | Only one category has a value | It renders as a full ring or pie, not a degenerate arc. |
| Totals | Spending exceeds the budget | The meter turns red, and remaining is negative and red. |
| Months | A user navigates to a month with no tracker | Empty state with a create button. Browsing alone never creates a tracker. |
| Time | Current month and "overdue" | Use the user's local date. |
| Concurrency | Two members edit the same expense at once | Realtime shows the other member's change in the open dialog. The second save is rejected by the `updated_at` check (§6.6), so nothing is silently overwritten. |
| Concurrency | An item is deleted while another member is editing it | The dialog closes with a "deleted by {member}" toast. |
| Concurrency | Two members create the same month's tracker at once | `unique(household_id, year, month)` prevents a duplicate. The second request returns the existing tracker, with its copies skipped, and the UI shows it. |
| Concurrency | Two members create a category with the same name at once | The case-insensitive unique index rejects the second one with the duplicate-name error. |
| Realtime | The connection drops | Show a subtle "Reconnecting…" indicator. Refetch the current month once reconnected. |
| Months | Deleting a month's tracker | Every expense in that month is deleted; categories and other months stay. The dialog shows counts and totals, and the user must type the month label. The month shows its empty state and can be recreated. |
| Concurrency | A tracker is deleted while another member is viewing it | Their view switches to the empty state with a "deleted by {member}" toast. Open expense dialogs for that month close. |
| Out of scope | Owner transfer, deleting a household, removing a member | Not available in v1. There is no UI for any of them. |
| Clipboard | The clipboard API is unavailable | Fall back to selecting the text, with instructions. |

---

## 8. Data access (Supabase)

**Simple reads and writes** go straight to the tables with `supabase-js`. RLS (§5.2) makes them safe. This covers:
- categories: list, insert, update, delete
- expenses: list, insert, update, delete
- trackers: list
- household: rename
- bank accounts (§6.7): list, insert, update, delete, each limited to the caller's own rows

**Multi-step or sensitive operations** run as Postgres functions (`security definer`, with `search_path` set), called with `supabase.rpc()`. Each runs in a single transaction and checks `auth.uid()` itself.

| RPC | Arguments | Does | Errors |
|---|---|---|---|
| `create_household` | `p_name` | Checks the caller has no membership. Creates the household with a unique code (retries on collision), and inserts the caller as `owner`. Returns the household with its code. | `ALREADY_IN_HOUSEHOLD`, `INVALID_NAME` |
| `lookup_household` | `p_code` | Normalizes the code and finds the household. Returns `{ name, owner_name, members: [{ display_name, avatar_url }] }` only. **Rate-limited** (see below). | `INVALID_CODE_FORMAT`, `NOT_FOUND`, `RATE_LIMITED` |
| `join_household` | `p_code` | Re-checks the code and checks the caller has no membership, then inserts them as `member`. | `ALREADY_IN_HOUSEHOLD`, `NOT_FOUND` |
| `leave_household` | — | Rejects the owner. Reassigns all of the caller's expenses in the household to the owner, then deletes the caller's membership. | `OWNER_CANNOT_LEAVE`, `NOT_IN_HOUSEHOLD` |
| `delete_household` | — | Owner only. Deletes the caller's household; memberships, categories, trackers, and expenses cascade. Returns `{ household_name, member_count, tracker_count, expense_count }`. | `NOT_AUTHENTICATED`, `NOT_IN_HOUSEHOLD`, `NOT_OWNER` |
| `reset_household_code` | — | Generates a new unique code for the caller's household and returns it. | `NOT_IN_HOUSEHOLD` |
| `get_copy_source` | `p_year, p_month` | Returns the most recent tracker before that month that has at least one expense, with its expenses grouped by category. Returns null if there is none. | — |
| `create_tracker` | `p_year, p_month, p_copy_expense_ids uuid[] default '{}', p_include_actual bool default false` | Inserts the tracker, or returns the existing one on a unique conflict. Copies the selected expenses following the rules in §6.3.4: due day clamped to the month's last day, owner falls back to the household owner, actual set to 0 unless `p_include_actual`. | `NOT_IN_HOUSEHOLD` |
| `delete_tracker` | `p_tracker_id` | Deletes one of the caller's household's trackers; its expenses cascade. Returns `{ year, month, expense_count, budgeted_cents, actual_cents }`. | `NOT_AUTHENTICATED`, `NOT_IN_HOUSEHOLD`, `TRACKER_NOT_FOUND` |
| `category_delete_impact` | `p_category_id` | Returns `{ expense_count, month_count, budgeted_cents, actual_cents }` for the delete confirmation dialog. | — |

Implementation notes:
- **Error codes:** raise errors with stable codes (for example `raise exception 'ALREADY_IN_HOUSEHOLD'`) and map each one to the user-facing messages in §6.
- **Rate limiting `lookup_household`:**
  - Record each attempt in a `code_lookup_attempts(user_id, attempted_at)` table.
  - Reject the call when the caller has made more than about 10 attempts in 10 minutes.
  - Optionally, add IP-based limiting in Next.js middleware or with Vercel's rate limiting.
- **Auth:**
  - Sign-in uses `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })`.
  - The callback route exchanges the code for a session.
  - Then the user is redirected to `/tracker` or `/onboarding`, depending on whether they have a membership.
  - For the button, follow Google's branding guidelines, or use Google Identity Services with `signInWithIdToken`.
- **Routes:**
  - `/` is the landing page.
  - `/onboarding`
  - `/tracker`, which opens on the current month, and `/tracker/[yyyy-mm]` for a specific month.
  - `/auth/callback`
  - `/profile` (§6.7)
  - Middleware enforces the redirects in §2.
- **Types:** generate TypeScript types with `supabase gen types typescript`.
- **Migrations:** keep every schema change, RLS policy, trigger, and function in `supabase/migrations`.

---

## 9. Design system

### 9.1 Direction
A green, futuristic, modern look:
- a deep green-black base with a faint 32px grid and soft radial glows
- a mint-neon accent with glows on primary actions
- rounded pill buttons and monospace numbers.

Use one bold accent and keep everything else quiet.

### 9.2 Tokens

| Token | Dark (default) | Light |
|---|---|---|
| `--bg` | `#06110D` | `#EDF5F0` |
| `--surface` | `#0C1E17` | `#FFFFFF` |
| `--surface-2` | `#11281F` | `#F3F9F5` |
| `--line` | `#1B3B2F` | `#D2E5DA` |
| `--line-strong` | `#2B5A47` | `#A6CBB7` |
| `--fg` | `#E3F6EC` | `#0A2A1E` |
| `--muted` | `#8DB2A2` | `#4A6E5F` |
| `--faint` | `#5C8473` | `#7B9B8D` |
| `--accent` | `#3DF5A0` | `#0A9C61` |
| `--accent-ink` (text on accent) | `#03140C` | `#FFFFFF` |
| `--danger` | `#FF7070` | `#CF3F3F` |
| `--warn` | `#F2C94C` | `#A87A06` |

- The logo tile uses a gradient from `#3DF5A0` to `#16B8C9` with a dark trend-arrow glyph.
- **Fonts** (Google Fonts):
  - **Sora** for headings
  - **IBM Plex Sans** for body text
  - **JetBrains Mono** for numbers, codes, and eyebrow labels, with tabular numerals.
- Eyebrow labels are uppercase monospace at 11–12px with wide letter-spacing.

### 9.3 Category palette (works in both themes)
`#22D88F`, `#16B8C9`, `#9BD93B`, `#7B6CF0`, `#F2B53C`, `#EF6F8E`, `#3FA7F5`, `#1F8F6A`, `#C97CF2`, `#F28A3C`, `#D9434F`, `#E35FC0`, `#F7A8C8`, `#3F51C8`, `#A65F30`, `#E8E05A`

New categories take the first color not already in use, in this order. Member avatars use only the first 10, so their dark initials stay readable.

### 9.4 Responsiveness
- Supported widths: from 360px phones up to wide desktops. The page must never scroll horizontally.
- Breakpoints:
  - ≤ 900px: the chart and summary cards stack.
  - ≤ 640px (phone layout):
    - tables become stacked labeled cards
    - dialogs become **bottom sheets** that respect the safe-area inset
    - button labels collapse to icons
    - form inputs use a 16px font so iOS doesn't zoom in on focus
  - ≤ 380px: KPI tiles stack into one column, and the view-toggle labels hide.
- On touch devices (`pointer: coarse`), icon buttons are at least 40×40px.
- The chart layout uses a **container query** (see §6.3.5).

### 9.5 Accessibility
- All dialogs are built in the page, never with `alert` or `confirm`. Each has `role="dialog"` and `aria-modal`, and a close (×) button in its top-right corner (label "Close"). The × button, Esc, and clicking the backdrop all close them, and focus returns to the control that opened them.
- Focus is always visible (a 2px accent outline).
- Use `role="switch"`, `role="radiogroup"`, and `role="separator"` where described above, with the correct ARIA states.
- Errors use `role="alert"`, and toasts use `role="status"`.
- Respect `prefers-reduced-motion`.
- Status is never shown by color alone: every pill has a text label.

---

## 10. Prototype references and what to drop

The three prototypes are Claude artifacts. They are private to Cholo, so export their HTML to use them as a visual reference:
- **Monthly Budget Tracker** (tracker page)
- **Monthly Budget Tracker Home** (landing page)
- **Monthly Budget Tracker Onboarding**

The prototypes include **prototype-only scaffolding that must not ship:**
- Example/sample data, the "Clear example data" banner, and the example member "Bea".
- **"Prototype: view as"** member switcher and the **Add test member** button in the Members dialog.
- The **"Prototype: back to the owner's view"**, **"Prototype: sign back in"**, and **"Prototype: start over"** buttons.
- Demo household lookup (`K7QM-XR4D` → Canonizado Household) and the clickable demo-code hint.
- Placeholder Google button, Sign out toasts, and links between artifacts. Replace them with real auth and routing.
- Use of localStorage as the data store. Only UI preferences stay client-side (§5).
- Fake loading delays (`setTimeout`).

---

## 11. Resolved decisions

| Question | Decision for v1 |
|---|---|
| Owner transfer | **Not available.** The creator stays the owner. |
| Deleting a household | **Owner only**, from Settings, with a typed confirmation. Every member goes back to onboarding. |
| Removing members | **Not available.** Members can only leave on their own; the owner can't leave. |
| Live sync | **Required.** Use Supabase Realtime for every household, especially those with several members (§6.6). |
| Deleting trackers | **Available to every member**, from Settings, with a typed confirmation. Deletes the month's expenses; categories stay. |
| Household code expiry | **Codes never expire** and have no usage limit. They change only when a member resets them. |
| Currency | **PHP (₱) only.** |
| Profile accounts | **Private to each user** and separate from the household: no tracker numbers use them, and household or tracker deletions don't touch them. Manual balances only (no bank syncing), zero or more, with no account type. |
| "Last edited by" on expenses | **Not shown.** `created_by` and `updated_by` stay in the schema for record-keeping and for the realtime conflict notices (§6.6), but no screen displays them. |

There are no open questions left.

---

## 12. Acceptance criteria (summary)

- [ ] The app is built with Next.js (App Router, TypeScript) and Tailwind CSS on Supabase. The schema, RLS, triggers, and RPCs live in `supabase/migrations`.
- [ ] RLS is enabled on every table. A signed-in user can never read or write another household's data, including through realtime.
- [ ] Google sign-in through Supabase Auth works. Routing sends users to onboarding or the tracker based on membership.
- [ ] The one-household-per-user rule is enforced in the database (`household_members.user_id` primary key) and in the RPCs.
- [ ] Live sync: with two browsers signed in as different members, every create, edit, and delete appears in the other browser within about 2 seconds, without a refresh. Edit conflicts are handled as in §6.6.
- [ ] No UI exists for owner transfer or removing members.
- [ ] Only the owner can delete the household (Settings → Household), after typing its name. Every member is moved to the "deleted" screen live and then to onboarding.
- [ ] Deleting a month's tracker (Settings → This month) requires typing the month label, removes its expenses for every member live, and leaves the month ready to recreate.
- [ ] Create household (name 2–50) generates a unique `XXXX-XXXX` code from the allowed alphabet.
- [ ] Join by code normalizes input, validates it, shows a confirmation step, then joins.
- [ ] Any member can rename the household and view, copy, or reset the code. Reset invalidates the old code.
- [ ] Non-owners can leave the household. Their expenses are reassigned to the owner. The owner cannot leave.
- [ ] The tracker page opens on the current month. Months can be navigated, created, and copied from the previous month as specified.
- [ ] Categories are shared across months, unique ignoring case, and editable with changes applied everywhere. Deletion cascades after a type-the-name confirmation.
- [ ] Expense CRUD supports all fields and validation. Money inputs format as you type and on blur. Status is derived.
- [ ] The KPI tiles, category summary, and nested budget/actual chart match the spec, with hover/tap/focus readouts.
- [ ] The table/list toggle is saved. Table sorting works on the six columns, with a dropdown on mobile. The category filter works.
- [ ] The chart/summary split is resizable on desktop (28–70%, default 42%), keyboard accessible, and saved.
- [ ] Light/dark mode follows the system until toggled, is saved, and is consistent across pages.
- [ ] The profile page lists the user's accounts with a total and supports add, edit, inline balance update, and delete. Nobody else can read those rows, and deleting a tracker or the household leaves them unchanged.
- [ ] The "Made by CholoCMC" footer on every page links to https://www.cholocmc.com.
- [ ] Every page passes a mobile review at 360–400px: no horizontal scroll, stacked tables, bottom-sheet dialogs, and touch-sized targets.
- [ ] No prototype-only scaffolding from §10 ships.
