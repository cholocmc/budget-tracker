---
name: BudgetMate
description: Shared household budgeting in pesos. A calm, dark control room for the month's money.
colors:
  vault-black: "#06110D"
  surface: "#0C1E17"
  surface-raised: "#11281F"
  line: "#1B3B2F"
  line-strong: "#2B5A47"
  ink: "#E3F6EC"
  muted: "#8DB2A2"
  faint: "#5C8473"
  peso-green: "#3DF5A0"
  peso-green-ink: "#03140C"
  peso-green-text: "#3DF5A0"
  lagoon: "#16B8C9"
  danger: "#FF7070"
  warn: "#F2C94C"
  vault-black-light: "#EDF5F0"
  surface-light: "#FFFFFF"
  surface-raised-light: "#F3F9F5"
  line-light: "#D2E5DA"
  line-strong-light: "#A6CBB7"
  ink-light: "#0A2A1E"
  muted-light: "#4A6E5F"
  faint-light: "#7B9B8D"
  peso-green-light: "#0A9C61"
  peso-green-ink-light: "#FFFFFF"
  peso-green-text-light: "#08794B"
  lagoon-light: "#0E8FA0"
  danger-light: "#CF3F3F"
  warn-light: "#A87A06"
typography:
  display:
    fontFamily: "Sora, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(38px, 5.6vw, 64px)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Sora, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(28px, 3.4vw, 40px)"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Sora, Segoe UI, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "JetBrains Mono, ui-monospace, Menlo, Consolas, monospace"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.14em"
  numeric:
    fontFamily: "JetBrains Mono, ui-monospace, Menlo, Consolas, monospace"
    fontSize: "clamp(20px, 2.6vw, 28px)"
    fontWeight: 600
    fontFeature: "tnum"
rounded:
  pill: "999px"
  sheet: "18px"
  feature: "22px"
  card: "14px"
  menu: "12px"
  field: "9px"
  control: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  panel: "18px"
  section: "72px"
components:
  button:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  button-primary:
    backgroundColor: "{colors.peso-green}"
    textColor: "{colors.peso-green-ink}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  button-ghost:
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  icon-button:
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    size: "32px"
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "9px 11px"
  chip:
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "18px"
  dialog:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "22px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.vault-black}"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
---

# Design System: BudgetMate

## Overview

**Creative North Star: "Mint Mission Control"**

BudgetMate is a calm control room for a household's month. The room is dark and quiet: Vault Black under a faint 32px graph-paper grid, with one or two soft green radial glows at the top edge of the page. Panels are lit readouts on that field. They separate by tone and thin lines, carry their numbers in tabular monospace, and sit still until something needs attention. Peso Green is the live signal. It marks the primary action, the selected state, the focus ring, and money that is still on plan, and almost nothing else.

Controls are tactile and confident. Buttons are full pills with a visible 1px border, so they read as pressable even at rest; the primary button is a solid green slab that glows on hover. Data stays precise: mono numerals, right-aligned amounts, uppercase mono labels with wide tracking. Density is that of a working tool: a full month of expenses, a chart, and three KPIs fit on one desktop screen without feeling crowded.

The system is dark-first and flips to a light theme with the same structure: a pale mint field, white panels, and a deeper green accent. The light theme is a full theme, not an inversion afterthought. It must hold the same hierarchy and contrast.

This is not a generic bank app (no corporate navy, no stock-photo trust signals) and not a crypto or trading screen (no glow on everything, no flashing tickers, no casino energy).

**Key Characteristics:**
- Dark-first green-black field with a faint 32px grid and soft top-edge glow.
- One accent, Peso Green, reserved for action, selection, focus, and on-plan money.
- Tabular monospace for every amount, code, and eyebrow label.
- Pill-shaped, bordered, pressable controls; 14px-cornered panels.
- Depth from tone and 1px lines at rest; shadows only for things that float.

## Colors

A near-black green field with green-tinted neutrals and one bright mint signal, mirrored by a pale mint light theme.

### Primary
- **Peso Green** (dark `peso-green`, light `peso-green-light`): the single accent. Primary buttons, the selected segment and chip, focus outlines, the Remaining KPI and positive amounts, the household code, active sort headers, the Settled status, and links in the footer. Text on it uses **Peso Green Ink** (`peso-green-ink`, light `peso-green-ink-light`).
- **Peso Green Text** (`peso-green-text`, light `peso-green-text-light`; CSS `--accent-text`): Peso Green for small text (links, positive amounts, the Settled pill, the active chip, footer links). In dark it equals the accent; in light it is a deeper green that passes 4.5:1, because the light accent alone measures about 3.2:1 on the page.
- **Lagoon** (`lagoon`, light `lagoon-light`): Peso Green's partner, used only as the far end of a gradient: the logo tile, the budget meter fill, the hero headline's second sentence, and the hero preview's border. Never a standalone color for UI.

### Neutral
- **Vault Black** (`vault-black`, light `vault-black-light`): the page background, under the grid and glows.
- **Surface** (`surface`): panels, cards, dialogs, menus, the month rail.
- **Surface Raised** (`surface-raised`): inputs, segmented controls, default buttons, group headers, row hover, and inset boxes inside a panel.
- **Line** (`line`) and **Line Strong** (`line-strong`): 1px dividers and panel borders; Line Strong for input, button, dialog, and table-header borders.
- **Ink** (`ink`): primary text and numbers.
- **Muted** (`muted`): secondary text, field labels, eyebrows, table headers.
- **Faint** (`faint`): hints, counts, and zero amounts. Never for anything the user must read to act.

### Status
- **Danger** (`danger`): Over budget, Overdue, negative Remaining, destructive buttons, and the border of danger dialogs and warning boxes.
- **Warn** (`warn`): Partly paid, the "Reconnecting…" pill, and notice boxes.
- Each status color has a soft tint (`--accent-soft`, `--danger-soft`, `--warn-soft`, 9–14% alpha) used as pill and box fill behind text in the full color.

### Category palette
Sixteen fixed hues (PRD §9.3), defined as `PALETTE` in code, work in both themes. Categories take the first unused one in order. Avatars use only the first ten so their dark initials (`#03140C`) stay readable. These, the logo gradient, and the dark ink on colored tiles are the only hard-coded colors allowed.

### Named Rules
**The One Signal Rule.** Peso Green means "act here", "this is selected", or "on plan". If a green element is none of those, it should be a neutral.

**The Never Color Alone Rule.** Every status pill carries a dot and a text label. Red or amber is never the only way a state is shown.

**The Tokens Only Rule.** UI colors come from the CSS variables on `:root` (or the Tailwind names mapped to them). A new hex in a component is a bug unless it belongs to the category palette or logo gradient.

## Typography

**Display Font:** Sora (with Segoe UI, system-ui)
**Body Font:** IBM Plex Sans (with system-ui, -apple-system)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, Menlo, Consolas)

**Character:** Sora gives headings a rounded, geometric confidence. Plex keeps body text plain and readable. JetBrains Mono turns every number into an instrument reading.

### Hierarchy
- **Display** (700, `clamp(38px, 5.6vw, 64px)`, 1.04): the landing hero headline only.
- **Headline** (700, `clamp(28px, 3.4vw, 40px)`, 1.12): landing section headings and the closing band.
- **Title** (600, 17–24px): app page and panel headings. The month label is 24px (20px on phones), dialogs 19px, panels 17px.
- **Body** (400, 15px, 1.5; landing 16px, 1.6): all running text. Lede and empty-state copy cap at 46–52ch.
- **Label** (400, 11–12px, 0.08–0.16em tracking, uppercase, mono): eyebrows, field labels, table headers, stacked-card labels, tags. Never below 11px. Section headings carry no eyebrow above them; the landing hero's is the one exception.
- **Numeric** (600, mono, tabular numerals): KPI values (`clamp(20px, 2.6vw, 28px)`), totals, every amount in tables, lists, and legends.

### Named Rules
**The Mono Money Rule.** Every peso amount, household code, count, and percentage is set in JetBrains Mono with tabular numerals, so columns line up and numbers read as data.

**The Real Case Rule.** Labels are uppercase mono, except a label that quotes text the user must type exactly (a category or household name to confirm a delete). That label keeps the real case in body type.

## Layout

The app is a single centered column (max 1240px on the tracker, 1120px on profile, 1180px on landing) with a 16px side gutter that respects safe-area insets. Sections stack with a 20px gap (14px on phones). Inside panels, rhythm is 8–16px; panels pad 18px (14px on phones). Landing sections breathe with 72px vertical padding (52px on phones).

The tracker's chart and summary sit in a resizable split (28–70%, default 42%) with a 16px drag handle. The chart lays out by its own width through a container query, not the viewport.

Responsive behavior is required, not optional:
- **≤ 960px (landing):** hero and showcase stack; features drop to two columns.
- **≤ 900px:** the split stacks and the resizer hides; profile columns stack.
- **≤ 640px:** tables become stacked labeled cards; dialogs become bottom sheets; button labels collapse to icons; form inputs use 16px text; toolbar controls go full width.
- **≤ 380px:** KPI tiles stack to one column; view-toggle labels hide.
- **pointer: coarse:** icon buttons grow to 40×40px.
- No horizontal scroll at any width from 360px up.

## Elevation & Depth

Tonal at rest, lift to float. Panels, cards, and rows sit flat on the page and separate by stepping from Vault Black to Surface to Surface Raised, with 1px Line borders. Shadows exist only for things that float above the page: dialogs, the account menu, toasts, the onboarding card, and the landing preview cards. Glow is light, not shadow. It belongs to Peso Green alone: the primary button on hover, the logo tile, the selected onboarding choice, the live-member dot, and the active resizer.

### Shadow Vocabulary
- **Float** (`--shadow`: dark `0 18px 50px rgba(0,0,0,.5)`, light `0 18px 40px rgba(10,42,30,.14)`): dialogs, menus, toasts, full-screen notice cards.
- **Float Large** (`--shadow-lg`: dark `0 30px 80px rgba(0,0,0,.55)`, light `0 30px 60px rgba(10,42,30,.16)`): the onboarding card and landing preview cards.
- **Accent Glow** (`0 0 22px var(--glow)` on primary button hover; lifted `0 6px 20px var(--glow)` under the logo tile): `--glow` is Peso Green at 30% (22% in light).
- **Sign-in Lift** (`0 12px 32px -8px var(--glow)`): under the landing sign-in plate only.
- **Focus Halo** (`0 0 0 3px var(--accent-soft)`): focused inputs, alongside a Peso Green border.

### Named Rules
**The Flat Panel Rule.** A panel that lives in the page flow never gets a drop shadow. If it needs separation, step its tone or strengthen its line.

**The Green Light Rule.** Only Peso Green glows. Neutral, danger, and warn elements never get a glow.

## Shapes

Soft geometry with exact data inside. Interactive controls are full pills: buttons, chips, segmented toggles, selects, the month input, toasts, and status pills. Containers use a 14px corner (`card`); fields and inset boxes 9px (`field`); icon buttons and small swatches 8px (`control`). Floating showcase pieces (the onboarding card and landing preview) go larger at 22px, and phone bottom sheets round only their top corners at 18px. Avatars and status dots are circles. Dashed borders mean "placeholder or example": empty states, the household code box, and the "Example data" tag.

## Components

### Buttons
Tactile and confident: every button reads as pressable before you touch it.
- **Shape:** full pill (`pill`), 8px 14px padding, 14px Plex 500, an 8px icon gap.
- **Default:** Surface Raised fill with a Line Strong border; hover shifts the border to Peso Green.
- **Primary:** solid Peso Green with Peso Green Ink text at 600 weight; hover adds the Accent Glow. One per view region.
- **Ghost:** transparent with Muted text; hover brings Ink text and a Line border.
- **Danger / Danger outline:** solid Danger with white text for the final destructive confirmation; outline for the step before.
- **Busy:** `aria-busy="true"` shows an inline spinner and a progress cursor. **Disabled:** 45% opacity, no glow.
- **Icon button:** 32px square (40px on touch), 8px corners, Muted icon; hover adds a Surface Raised fill and Line Strong border; delete icons hover to Danger.

### Chips and Status Pills
- **Month chips:** mono 12px pills with a Line border and Muted text; the current month gets a Peso Green border, text, and soft fill (`aria-current`).
- **Segmented toggle (Table / List):** a Surface Raised pill track with a 3px inset; the pressed segment is solid Peso Green.
- **Status pills:** 12px text with a 6px leading dot in the text color. Settled = Peso Green on soft green, Partly paid = Warn on soft amber, Over budget and Overdue = Danger on soft red, Upcoming = Muted with a Line Strong outline.

### Cards / Containers
- **Corner Style:** 14px (`card`).
- **Background:** Surface, with Surface Raised for nested boxes and group headers.
- **Shadow Strategy:** none in flow (see Elevation & Depth).
- **Border:** 1px Line; Line Strong for dialogs and notice cards; Danger for danger dialogs.
- **Internal Padding:** 18px panels, 16–18px KPI tiles, 22px dialogs.

### Inputs / Fields
- **Style:** Surface Raised fill, 1px Line Strong border, 9px corners, 9px 11px padding. Labels sit above in uppercase mono 12px Muted; hints below in 12px Faint.
- **Money input:** a Muted "₱" prefix inside the field, mono tabular text, formatted as you type.
- **Focus:** the border turns Peso Green and a 3px Focus Halo appears; no outline.
- **Error / Disabled:** an `aria-invalid` field gets a Danger border with a `role="alert"` message below; disabled text drops to Muted.

### Navigation
- **Tracker header:** the logo tile, the household name in Sora with a rename pencil, a Muted sub-line, overlapping member avatars, and the account avatar menu on the right.
- **Month rail:** a Surface panel with previous/next icon buttons, the month in 24px Sora with a mono eyebrow above it, and month chips on the right. On phones it stacks and the chips scroll horizontally with no scrollbar.
- **Account menu:** a 12px-cornered floating Surface menu with Float shadow and 40px-tall items.

### Dialogs
Always `<Modal>`: a blurred scrim, a Surface card with a Line Strong border, a 19px Sora title, and a 40px × close button tucked into the top-right corner. Actions align right. Below 640px the dialog becomes a bottom sheet with top-only 18px corners, safe-area padding, and full-width action buttons. Destructive dialogs swap the border to Danger and show the impact in a Danger warning box before the typed confirmation.

### Budget vs. Actual Chart (signature)
A hand-built SVG nested chart: an outer ring for budgeted and an inner pie for actual, one category color per slice, with 2px Surface-colored gaps between slices. Hovering or focusing a slice dims the others to 30% and fills a fixed-height three-line readout so nothing below it jumps. A ring with all-zero values shows a dashed placeholder. The landing preview gives it a gentle settle-in rotation, which reduced motion turns off.

### KPI Tiles and Meter
Three Surface tiles (Budgeted, Actual, Remaining) with a mono eyebrow, a large mono value, and a footnote. Remaining is Peso Green, or Danger when negative. The budget meter is a 6px pill track filled with a Peso Green to Lagoon gradient, which turns solid Danger when spending exceeds the budget.

### Sign-in Plate (landing)
Google's official button is an iframe that can't be restyled, so its emphasis is built around it: a 6px pill plate in soft Peso Green (`--accent-soft`) with a 45% accent inner line and the Sign-in Lift. Google's button always uses its white "outline" theme. While Google's script loads, a 300×44 placeholder pill shimmers in its place; if the script fails, the redirect button takes the plate instead. Full width on phones. Two muted notes sit under it (joining with a code, what Google shares). This plate is the one green action on the landing page, so labels, bullets, and step numbers there stay neutral.

### Toast
A pill in inverted colors (Ink fill, Vault Black text) centered at the bottom above the safe area, with the Float shadow and `role="status"`.

## Do's and Don'ts

### Do:
- **Do** use CSS variables (`var(--accent)`, `bg-surface`, `text-muted`, `border-line`) for every UI color, and check both themes.
- **Do** set every amount, code, and percentage in JetBrains Mono with tabular numerals, right-aligned in columns.
- **Do** keep Peso Green rare: primary action, selection, focus, and on-plan money.
- **Do** give every status a dot and a text label in a pill.
- **Do** separate in-flow panels with tone and 1px lines; save shadows for dialogs, menus, toasts, and showcase cards.
- **Do** keep touch targets at least 40px, inputs at 16px text on phones, and dialogs as bottom sheets below 640px.
- **Do** keep the visible 2px Peso Green focus outline on every interactive element.
- **Do** honor `prefers-reduced-motion`. Every animation and transition turns off.

### Don't:
- **Don't** drift toward a generic bank app: no corporate navy, no stock-photo trust imagery, no "secure banking" badges.
- **Don't** drift toward crypto or trading screens: no glow on neutral surfaces, no flashing or ticking numbers, no neon on every element.
- **Don't** introduce a second accent. Lagoon appears only at the end of a Peso Green gradient.
- **Don't** add drop shadows to panels, KPI tiles, rows, or groups that sit in the page.
- **Don't** hard-code hex colors outside the category palette and logo gradient.
- **Don't** use `alert` or `confirm`, or add a chart library. Dialogs are `<Modal>`, and charts are hand-built SVG.
- **Don't** show status by color alone.
