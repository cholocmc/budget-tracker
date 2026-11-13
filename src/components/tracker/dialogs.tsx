"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { IconCopy, IconDown, IconUp } from "@/components/Icons";
import { Modal } from "@/components/Modal";
import {
  PALETTE,
  PALETTE_NAMES,
  centsToInput,
  fmtCents,
  fmtDue,
  initials,
  inputToCents,
  lastDayOf,
  memberColor,
  monthKey,
  monthLabel,
  plural,
  shiftDue,
  todayISO,
} from "@/lib/format";
import type { Category, CopySource, DeleteImpact, Expense } from "@/lib/types";
import { ROWS_DEFAULT, ROW_INFO, useTracker, type DialogState, type RowId } from "./context";
import { MoneyInput as MoneyField } from "./MoneyInput";
import { findExpense } from "./store";

export function Dialogs({ dialog }: { dialog: DialogState }) {
  switch (dialog.kind) {
    case "rename":
      return <RenameDialog />;
    case "members":
      return <MembersDialog />;
    case "leave":
      return <LeaveDialog />;
    case "invite":
      return <InviteDialog />;
    case "category":
      return <CategoryDialog id={dialog.id} />;
    case "deleteCategory":
      return <DeleteCategoryDialog id={dialog.id} />;
    case "expense":
      return <ExpenseDialog id={dialog.id} />;
    case "deleteExpense":
      return <DeleteExpenseDialog id={dialog.id} />;
    case "copy":
      return <CopyDialog source={dialog.source} />;
    case "settings":
      return <SettingsDialog />;
    case "deleteTracker":
      return <DeleteTrackerDialog id={dialog.id} />;
    case "deleteHousehold":
      return <DeleteHouseholdDialog />;
  }
}

/* ---------- Delete a month's tracker (PRD §4.3) ---------- */
function DeleteTrackerDialog({ id }: { id: string }) {
  const { state, ops, close } = useTracker();
  const live = state.trackers.find((t) => t.id === id);
  const snapshot = useRef(live);
  if (live) snapshot.current = live;
  // Counted when the dialog opens; the month is loaded because the button only shows for the viewed month.
  const [impact] = useState(() => {
    const list = state.expenses[id] ?? [];
    return {
      n: list.length,
      budgeted: list.reduce((s, x) => s + Number(x.budgeted_cents), 0),
      actual: list.reduce((s, x) => s + Number(x.actual_cents), 0),
    };
  });
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const t = snapshot.current;
  if (!t) return null;
  const label = monthLabel(monthKey(t.year, t.month));
  const ok = typed.trim().toLowerCase() === label.toLowerCase();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true);
    const error = await ops.deleteTracker(t);
    if (error) {
      setBusy(false);
      setErr(error);
      return;
    }
    close();
  };

  return (
    <Modal title={`Delete the ${label} tracker?`} onClose={close} variant="danger" initialFocus="#dt-confirm">
      <div className="warn-box">
        <strong>This can&apos;t be undone.</strong>{" "}
        {impact.n ? (
          <>
            It deletes all <b>{impact.n}</b> expense{impact.n === 1 ? "" : "s"} in {label} ({fmtCents(impact.budgeted)} budgeted,{" "}
            {fmtCents(impact.actual)} spent) for everyone in the household.
          </>
        ) : (
          <>{label} has no expenses, but the month will be removed for everyone in the household.</>
        )}{" "}
        Categories and other months stay. You can create {label} again afterwards, empty or copied from an earlier month.
      </div>
      <form className="form" onSubmit={submit} noValidate>
        <div className="field full">
          <label htmlFor="dt-confirm" className="as-typed">
            Type <b>&ldquo;{label}&rdquo;</b> to confirm
          </label>
          <input id="dt-confirm" autoComplete="off" placeholder={label} value={typed} onChange={(e) => { setTyped(e.target.value); setErr(""); }} />
        </div>
        <div className="err field full" role="alert">{err}</div>
        <div className="modal-actions field full">
          <button type="button" className="btn ghost" onClick={close}>Keep tracker</button>
          <button type="submit" className="btn danger" disabled={!ok || busy}>
            {busy ? "Deleting…" : "Delete tracker"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Delete the whole household (owner only, PRD §4.1) ---------- */
function DeleteHouseholdDialog() {
  const { state, me, ops, close } = useTracker();
  const name = state.household.name;
  const others = state.members.filter((m) => m.user_id !== me).length;
  const months = state.trackers.length;
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ok = typed.trim().toLowerCase() === name.toLowerCase();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true);
    const error = await ops.deleteHousehold();
    if (error) {
      setBusy(false);
      setErr(error);
    }
  };

  return (
    <Modal title={`Delete ${name}?`} onClose={close} variant="danger" initialFocus="#dh-confirm">
      <div className="warn-box">
        <strong>Are you really sure?</strong> Deleting your household would put you
        {others ? " and all the members" : ""} back to onboarding, so you either have to create a new household or join
        another one.
      </div>
      <p>
        {months
          ? `This can't be undone. It deletes ${plural(months, "monthly tracker")}, every category, and every expense in ${name}.`
          : `This can't be undone. It deletes ${name} and every category in it.`}
      </p>
      <form className="form" onSubmit={submit} noValidate>
        <div className="field full">
          <label htmlFor="dh-confirm" className="as-typed">
            Type <b>&ldquo;{name}&rdquo;</b> to confirm
          </label>
          <input id="dh-confirm" autoComplete="off" placeholder={name} value={typed} onChange={(e) => { setTyped(e.target.value); setErr(""); }} />
        </div>
        <div className="err field full" role="alert">{err}</div>
        <div className="modal-actions field full">
          <button type="button" className="btn ghost" onClick={close}>Keep household</button>
          <button type="submit" className="btn danger" disabled={!ok || busy}>
            {busy ? "Deleting…" : "Delete household"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Settings: section order (saved per device) ---------- */
function SettingsDialog() {
  const { rows, setRows, close, open, tracker, expenses, month, state, me } = useTracker();
  // Only the owner can delete the household (PRD §4.1).
  const isOwner = state.household.owner_id === me;
  const [draft, setDraft] = useState<RowId[]>(rows);
  const [announce, setAnnounce] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  // After a move, keep focus on the moved row's button (or its other arrow once it hits an end).
  const refocus = useRef<{ row: RowId; dir: "up" | "down" } | null>(null);

  useEffect(() => {
    const f = refocus.current;
    if (!f || !listRef.current) return;
    refocus.current = null;
    const q = (d: string) => listRef.current!.querySelector<HTMLButtonElement>(`button[data-row="${f.row}"][data-dir="${d}"]`);
    const btn = q(f.dir);
    (btn && !btn.disabled ? btn : q(f.dir === "up" ? "down" : "up"))?.focus();
  }, [draft]);

  const move = (i: number, dir: "up" | "down") => {
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= draft.length) return;
    const next = [...draft];
    [next[i], next[j]] = [next[j], next[i]];
    refocus.current = { row: draft[i], dir };
    setDraft(next);
    setAnnounce(`${ROW_INFO[draft[i]].name} moved to position ${j + 1} of ${next.length}.`);
  };

  const isDefault = draft.every((r, i) => r === ROWS_DEFAULT[i]);
  const changed = draft.some((r, i) => r !== rows[i]);

  return (
    <Modal title="Settings" onClose={close} initialFocus="#st-save">
      <div>
        <div className="eyebrow" style={{ marginBottom: 4 }}>Section order</div>
        <p className="code-note">Arrange the tracker&apos;s sections. This only changes the layout on this device.</p>
      </div>
      <div className="order-wrap">
        <ol className="order-list" ref={listRef}>
          {draft.map((r, i) => (
            <li key={r}>
              <span className="order-pos" aria-hidden="true">{i + 1}</span>
              <span className="order-text">
                <b>{ROW_INFO[r].name}</b>
                <small>{ROW_INFO[r].detail}</small>
              </span>
              <span className="order-btns">
                <button
                  type="button"
                  className="icon-btn"
                  data-row={r}
                  data-dir="up"
                  aria-label={`Move ${ROW_INFO[r].name} up`}
                  disabled={i === 0}
                  onClick={() => move(i, "up")}
                >
                  <IconUp />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  data-row={r}
                  data-dir="down"
                  aria-label={`Move ${ROW_INFO[r].name} down`}
                  disabled={i === draft.length - 1}
                  onClick={() => move(i, "down")}
                >
                  <IconDown />
                </button>
              </span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="link-btn order-reset"
          disabled={isDefault}
          onClick={() => {
            setDraft(ROWS_DEFAULT);
            setAnnounce("Sections reset to the default order.");
          }}
        >
          Reset to default
        </button>
      </div>
      <div className="sr-only" aria-live="polite">{announce}</div>
      {tracker && expenses && (
        <div className="eyebrow">This month</div>
      )}
      {tracker && expenses && (
        <div className="leave-box">
          <div>
            <b>Delete the {monthLabel(month)} tracker</b>
            <p>Removes this month and its expenses for everyone, so you can start it again.</p>
          </div>
          <button type="button" className="btn danger-outline" onClick={() => open({ kind: "deleteTracker", id: tracker.id })}>
            Delete tracker
          </button>
        </div>
      )}
      {isOwner && <div className="eyebrow">Household</div>}
      {isOwner && (
        <div className="leave-box">
          <div>
            <b>Delete {state.household.name}</b>
            <p>Removes the household, every tracker, and every expense for all members.</p>
          </div>
          <button type="button" className="btn danger-outline" onClick={() => open({ kind: "deleteHousehold" })}>
            Delete household
          </button>
        </div>
      )}
      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={close}>Cancel</button>
        <button
          id="st-save"
          type="button"
          className="btn primary"
          onClick={() => {
            if (changed) setRows(draft);
            close();
          }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

function MemberList() {
  const { state, me, memberIndex } = useTracker();
  return (
    <ul className="member-list">
      {state.members.map((m) => (
        <li key={m.user_id}>
          <span className="av" style={{ background: memberColor(memberIndex(m.user_id)) }}>{initials(m.display_name)}</span>
          <span style={{ overflowWrap: "anywhere" }}>{m.user_id === me ? `${m.display_name} (you)` : m.display_name}</span>
          <span className="role">{m.role === "owner" ? "Owner" : "Member"}</span>
        </li>
      ))}
    </ul>
  );
}

/** Closes a dialog with a toast when the item it edits is deleted by someone else (PRD §6.6). */
function useCloseWhenDeleted(exists: boolean, id: string | undefined, label: string) {
  const { close, toast, deletedBy } = useTracker();
  const saving = useRef(false);
  useEffect(() => {
    if (!id || exists || saving.current) return;
    close();
    toast(`This ${label} was deleted by ${deletedBy(id) ?? "another member"}.`);
  }, [exists, id, label, close, toast, deletedBy]);
  return saving;
}

/* ---------- Rename household ---------- */
function RenameDialog() {
  const { state, ops, close } = useTracker();
  const [name, setName] = useState(state.household.name);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = name.trim();
    if (!v) return setErr("Enter a household name.");
    if (v.length > 50) return setErr("Household names can be up to 50 characters.");
    if (v === state.household.name) return close();
    setBusy(true);
    const error = await ops.renameHousehold(v);
    setBusy(false);
    if (error) return setErr(error);
    close();
  };
  return (
    <Modal title="Rename household" onClose={close} selectText>
      <p>Every member sees this name at the top of the tracker.</p>
      <form className="form" onSubmit={submit} noValidate>
        <div className="field full">
          <label htmlFor="rn-name">Household name</label>
          <input id="rn-name" maxLength={50} value={name} autoComplete="off" onChange={(e) => { setName(e.target.value); setErr(""); }} />
        </div>
        <div className="err field full" role="alert">{err}</div>
        <div className="modal-actions field full">
          <button type="button" className="btn ghost" onClick={close}>Cancel</button>
          <button type="submit" className="btn primary" disabled={busy}>Save name</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Members ---------- */
function MembersDialog() {
  const { state, me, open, close } = useTracker();
  const isOwner = state.household.owner_id === me;
  return (
    <Modal title={state.household.name} onClose={close} initialFocus="button.primary, #members-done">
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>{plural(state.members.length, "member")}</div>
        <MemberList />
      </div>
      {isOwner ? (
        <p className="code-note">You own this household, so you can&apos;t leave it.</p>
      ) : (
        <div className="leave-box">
          <div>
            <b>Leave household</b>
            <p>You&apos;ll lose access to every monthly tracker here.</p>
          </div>
          <button type="button" className="btn danger-outline" onClick={() => open({ kind: "leave" })}>Leave household</button>
        </div>
      )}
      <div className="modal-actions">
        <button id="members-done" type="button" className="btn ghost" onClick={close}>Done</button>
      </div>
    </Modal>
  );
}

function LeaveDialog() {
  const { state, ops, close, ownerId, memberName } = useTracker();
  const [owned, setOwned] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    ops.ownedExpenseCount().then(setOwned);
  }, [ops]);
  const leave = async () => {
    setBusy(true);
    const error = await ops.leave();
    if (error) {
      setErr(error);
      setBusy(false);
    }
  };
  return (
    <Modal title={`Leave ${state.household.name}?`} onClose={close} variant="danger" initialFocus="#leave-stay">
      <div className="warn-box">
        <strong>You&apos;ll lose access right away.</strong> To come back, you&apos;ll need the household code from a member.
      </div>
      <p>
        {owned === null
          ? "Checking your expenses…"
          : owned
            ? `The ${plural(owned, "expense")} you own will stay in the household and move to ${memberName(ownerId)}, the owner.`
            : "You don't own any expenses, so nothing else in the household changes."}
      </p>
      <div className="err" role="alert">{err}</div>
      <div className="modal-actions">
        <button id="leave-stay" type="button" className="btn ghost" onClick={close}>Stay</button>
        <button type="button" className="btn danger" aria-busy={busy} disabled={busy || owned === null} onClick={leave}>
          {busy ? "Leaving…" : "Leave household"}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- Invite (household code) ---------- */
function InviteDialog() {
  const { state, ops, close, toast } = useTracker();
  const code = state.household.code;
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("Someone who already belongs to another household can't use this code until they leave it.");

  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast("Household code copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      if (codeRef.current) {
        const r = document.createRange();
        r.selectNodeContents(codeRef.current);
        const s = window.getSelection();
        s?.removeAllRanges();
        s?.addRange(r);
      }
      setNote("Copying isn't available here. The code is selected, so copy it with your keyboard or long-press.");
    }
  };
  const reset = async () => {
    if (!confirming) {
      setConfirming(true);
      setNote("Resetting makes the current code stop working. Current members stay in the household.");
      return;
    }
    setBusy(true);
    const err = await ops.resetCode();
    setBusy(false);
    setConfirming(false);
    setNote(err ?? "New code created. Share this one from now on.");
  };

  return (
    <Modal title={`Invite to ${state.household.name}`} onClose={close} initialFocus="#copy-code">
      <p>Share this household code. New members enter it when they sign up to join your household. Every member can add, edit, and delete anything.</p>
      <div className="code-box">
        <span className="eyebrow">Household code</span>
        <code className="hh-code" ref={codeRef}>{code}</code>
        <div className="code-actions">
          <button id="copy-code" type="button" className="btn primary" onClick={copy}>
            <IconCopy /><span>{copied ? "Copied" : "Copy code"}</span>
          </button>
          <button type="button" className={`btn ${confirming ? "danger" : "ghost"}`} disabled={busy} onClick={reset}>
            {confirming ? "Confirm reset" : "Reset code"}
          </button>
        </div>
        <p className="code-note" role="status">{note}</p>
      </div>
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Members</div>
        <MemberList />
      </div>
      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={close}>Done</button>
      </div>
    </Modal>
  );
}

/* ---------- Category add / edit ---------- */
function CategoryDialog({ id }: { id?: string }) {
  const { state, ops, close, me, memberName } = useTracker();
  const live = id ? state.categories.find((c) => c.id === id) : undefined;
  const [original, setOriginal] = useState<Category | undefined>(live);
  const used = state.categories.map((c) => c.color);
  const [name, setName] = useState(live?.name ?? "");
  const [color, setColor] = useState(live?.color ?? (PALETTE.find((c) => !used.includes(c)) || PALETTE[state.categories.length % PALETTE.length]));
  const [count, setCount] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useCloseWhenDeleted(!id || !!live, id, "category");

  useEffect(() => {
    if (id) ops.categoryImpact(id).then((i) => setCount(i?.expense_count ?? 0));
  }, [id, ops]);

  const changedBy = live && original && live.updated_at !== original.updated_at && live.updated_by !== me ? live.updated_by : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = name.trim();
    if (!v) return setErr("Enter a category name.");
    if (v.length > 40) return setErr("Category names can be up to 40 characters.");
    setBusy(true);
    saving.current = true;
    const error = await ops.saveCategory({ name: v, color }, original);
    saving.current = false;
    setBusy(false);
    if (error) return setErr(error);
    close();
  };

  return (
    <Modal title={id ? "Edit category" : "Add category"} onClose={close}>
      <p>
        {id
          ? `Categories are shared across all months.${count ? ` Changes apply to all ${plural(count, "expense")} in this category.` : ""}`
          : "The new category appears in every month."}
      </p>
      {changedBy && live && (
        <div className="notice-box" role="status">
          <span>{memberName(changedBy)} just updated this. Review the latest values before saving.</span>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setOriginal(live);
              setName(live.name);
              setColor(live.color);
              setErr("");
            }}
          >
            Load latest
          </button>
        </div>
      )}
      <form className="form" onSubmit={submit} noValidate>
        <div className="field full">
          <label htmlFor="cat-name">Name</label>
          <input id="cat-name" maxLength={40} value={name} placeholder="e.g. Bills" autoComplete="off" onChange={(e) => { setName(e.target.value); setErr(""); }} />
        </div>
        <div className="field full">
          <span className="label" id="cat-color-label">Color</span>
          <div className="swatches" role="group" aria-labelledby="cat-color-label">
            {PALETTE.map((c, i) => (
              <button key={c} type="button" style={{ background: c }} aria-label={PALETTE_NAMES[i] ?? `Color ${i + 1}`} title={PALETTE_NAMES[i]} aria-pressed={c === color} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
        <div className="err field full" role="alert">{err}</div>
        <div className="modal-actions field full">
          <button type="button" className="btn ghost" onClick={close}>Cancel</button>
          <button type="submit" className="btn primary" disabled={busy}>{id ? "Save changes" : "Add category"}</button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteCategoryDialog({ id }: { id: string }) {
  const { state, ops, close } = useTracker();
  const cat = state.categories.find((c) => c.id === id);
  const [impact, setImpact] = useState<DeleteImpact | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const saving = useCloseWhenDeleted(!!cat, id, "category");
  const snapshot = useRef(cat);
  if (cat) snapshot.current = cat;

  useEffect(() => {
    ops.categoryImpact(id).then((i) => setImpact(i ?? { expense_count: 0, month_count: 0, budgeted_cents: 0, actual_cents: 0 }));
  }, [id, ops]);

  const c = snapshot.current;
  if (!c) return null;
  const n = impact?.expense_count ?? 0;
  const ok = typed.trim() === c.name && !!impact;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true);
    saving.current = true;
    const error = await ops.deleteCategory(c, impact);
    if (error) {
      saving.current = false;
      setBusy(false);
      setErr(error);
      return;
    }
    close();
  };

  return (
    <Modal title={`Delete “${c.name}”?`} onClose={close} variant="danger" initialFocus="#del-confirm">
      <div className="warn-box">
        <strong>This can&apos;t be undone.</strong>{" "}
        {!impact
          ? "Counting the expenses in this category…"
          : n
            ? <>Deleting this category also deletes all <b>{n}</b> expense{n === 1 ? "" : "s"} in it across <b>{impact.month_count}</b> month{impact.month_count === 1 ? "" : "s"} ({fmtCents(impact.budgeted_cents)} budgeted, {fmtCents(impact.actual_cents)} spent).</>
            : "It has no expenses, but it will be removed from every month."}
      </div>
      <form className="form" onSubmit={submit} noValidate>
        <div className="field full">
          {/* Sentence case so the exact (case-sensitive) name to type is shown as-is. */}
          <label htmlFor="del-confirm" className="as-typed">
            Type <b>&ldquo;{c.name}&rdquo;</b> to confirm
          </label>
          <input id="del-confirm" autoComplete="off" placeholder={c.name} value={typed} onChange={(e) => setTyped(e.target.value)} />
        </div>
        <div className="err field full" role="alert">{err}</div>
        <div className="modal-actions field full">
          <button type="button" className="btn ghost" onClick={close}>Keep category</button>
          <button type="submit" className="btn danger" disabled={!ok || busy}>
            {busy ? "Deleting…" : `Delete category${n ? " and expenses" : ""}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Expense add / edit ---------- */
function ExpenseDialog({ id }: { id?: string }) {
  const { state, ops, close, me, month, filterCat, memberName } = useTracker();
  const live = id ? findExpense(state, id) : undefined;
  const [original, setOriginal] = useState<Expense | undefined>(live);
  const first = `${month}-01`;
  const last = `${month}-${String(lastDayOf(month)).padStart(2, "0")}`;
  const today = todayISO();
  const defaults = {
    name: "",
    category_id: filterCat !== "all" ? filterCat : state.categories[0]?.id ?? "",
    owner_id: me,
    budget: "",
    actual: "",
    due: today.startsWith(month) ? today : first,
  };
  const fromRow = (x: Expense) => ({
    name: x.name,
    category_id: x.category_id,
    owner_id: x.owner_id,
    budget: centsToInput(x.budgeted_cents),
    actual: centsToInput(x.actual_cents),
    due: x.due_date,
  });
  const [f, setF] = useState(live ? fromRow(live) : defaults);
  // Copy Budgeted into Actual for expenses paid in full. Starts unchecked (also when editing),
  // so opening an expense never changes its saved actual amount by itself.
  const [sameAsBudget, setSameAsBudget] = useState(false);
  const actualInput = sameAsBudget ? f.budget : f.actual;
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useCloseWhenDeleted(!id || !!live, id, "expense");
  const set = (patch: Partial<typeof f>) => {
    setF((p) => ({ ...p, ...patch }));
    setErr("");
  };

  const changedBy = live && original && live.updated_at !== original.updated_at && live.updated_by !== me ? live.updated_by : null;
  const ownerOptions = state.members.map((m) => ({ id: m.user_id, label: m.user_id === me ? `${m.display_name} (you)` : m.display_name }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = f.name.trim();
    const budgeted_cents = inputToCents(f.budget);
    const actual_cents = inputToCents(actualInput);
    if (!name) return setErr("Enter a name for this expense.");
    if (!Number.isFinite(budgeted_cents) || budgeted_cents < 0 || !Number.isFinite(actual_cents) || actual_cents < 0)
      return setErr("Amounts must be zero or more.");
    if (!f.due) return setErr("Pick a due date.");
    if (f.due < first || f.due > last) return setErr(`Pick a due date in ${monthLabel(month)}.`);
    if (!state.categories.some((c) => c.id === f.category_id)) return setErr("Pick a category.");
    if (!state.members.some((m) => m.user_id === f.owner_id)) return setErr("Pick an owner who is in the household.");
    setBusy(true);
    saving.current = true;
    const error = await ops.saveExpense({ name, category_id: f.category_id, owner_id: f.owner_id, budgeted_cents, actual_cents, due_date: f.due }, original);
    saving.current = false;
    setBusy(false);
    if (error) return setErr(error);
    close();
  };

  return (
    <Modal title={id ? "Edit expense" : "Add expense"} onClose={close}>
      {changedBy && live && (
        <div className="notice-box" role="status">
          <span>{memberName(changedBy)} just updated this. Review the latest values before saving.</span>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setOriginal(live);
              setF(fromRow(live));
              setSameAsBudget(false);
              setErr("");
            }}
          >
            Load latest
          </button>
        </div>
      )}
      <form className="form" onSubmit={submit} noValidate>
        <div className="field full">
          <label htmlFor="e-name">Expense</label>
          <input id="e-name" maxLength={60} value={f.name} placeholder="e.g. Meralco electricity" autoComplete="off" onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="e-cat">Category</label>
          <select id="e-cat" value={f.category_id} onChange={(e) => set({ category_id: e.target.value })}>
            {state.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="e-owner">Owner</label>
          <select id="e-owner" value={f.owner_id} onChange={(e) => set({ owner_id: e.target.value })}>
            {ownerOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="e-budget">Budgeted</label>
          <MoneyField id="e-budget" value={f.budget} onChange={(v) => set({ budget: v })} />
        </div>
        <div className="field">
          <label htmlFor="e-actual">Actual</label>
          <MoneyField id="e-actual" value={actualInput} disabled={sameAsBudget} onChange={(v) => set({ actual: v })} />
          <label className="check">
            <input
              type="checkbox"
              checked={sameAsBudget}
              onChange={(e) => {
                const on = e.target.checked;
                setSameAsBudget(on);
                // Turning it off keeps the mirrored amount so it can be adjusted from there.
                if (!on) set({ actual: f.budget });
              }}
            />{" "}
            Same as budgeted
          </label>
        </div>
        <div className="field full">
          <label htmlFor="e-due">Due date</label>
          <input id="e-due" type="date" value={f.due} min={first} max={last} onChange={(e) => set({ due: e.target.value })} />
          <span className="hint">Within {monthLabel(month)}</span>
        </div>
        <div className="err field full" role="alert">{err}</div>
        <div className="modal-actions field full">
          <button type="button" className="btn ghost" onClick={close}>Cancel</button>
          <button type="submit" className="btn primary" disabled={busy}>{id ? "Save changes" : "Add expense"}</button>
        </div>
      </form>
    </Modal>
  );
}


function DeleteExpenseDialog({ id }: { id: string }) {
  const { state, ops, close, month } = useTracker();
  const live = findExpense(state, id);
  const snapshot = useRef(live);
  if (live) snapshot.current = live;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const saving = useCloseWhenDeleted(!!live, id, "expense");
  const x = snapshot.current;
  if (!x) return null;
  const go = async () => {
    setBusy(true);
    saving.current = true;
    const error = await ops.deleteExpense(x);
    if (error) {
      saving.current = false;
      setBusy(false);
      setErr(error);
      return;
    }
    close();
  };
  return (
    <Modal title={`Delete “${x.name}”?`} onClose={close} variant="danger">
      <p>This removes the expense from {monthLabel(month)}.</p>
      <div className="err" role="alert">{err}</div>
      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={close}>Cancel</button>
        <button type="button" className="btn danger" disabled={busy} onClick={go}>{busy ? "Deleting…" : "Delete expense"}</button>
      </div>
    </Modal>
  );
}

/* ---------- Copy expenses on tracker creation (PRD §6.3.4) ---------- */
function CopyDialog({ source }: { source: CopySource }) {
  const { ops, close, month } = useTracker();
  const from = monthKey(source.year, source.month);
  const groups = source.categories.filter((g) => g.expenses?.length);
  const all = useMemo(() => groups.flatMap((g) => g.expenses.map((x) => x.id)), [groups]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(all));
  const [withActual, setWithActual] = useState(false);
  // Categories start collapsed so a long list is easy to scan; a lone category starts open.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(groups.length === 1 ? [groups[0].id] : []));
  const toggleOpen = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const total = all.length;
  const n = selected.size;

  const toggle = (ids: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((i) => (on ? next.add(i) : next.delete(i)));
      return next;
    });

  const create = async (ids: string[]) => {
    setBusy(true);
    const error = await ops.createTracker(ids, withActual);
    setBusy(false);
    if (error) return setErr(error);
    close();
  };

  return (
    <Modal title={`Copy expenses from ${monthLabel(from)}?`} onClose={close} variant="wide" initialFocus="#cp-go">
      <p>Pick the recurring expenses to bring into {monthLabel(month)}. Due dates move to the same day this month.</p>
      <div className="cp-tools">
        <span className="eyebrow">
          {plural(groups.length, "category", "categories")} · {plural(total, "expense")}
        </span>
        <span>
          <button type="button" className="link-btn" onClick={() => setSelected(new Set(all))}>Select all</button>
          {" · "}
          <button type="button" className="link-btn" onClick={() => setSelected(new Set())}>Clear</button>
        </span>
      </div>
      <div className="cp-list">
        {groups.map((g) => {
          const ids = g.expenses.map((x) => x.id);
          const on = ids.filter((i) => selected.has(i)).length;
          const isOpen = expanded.has(g.id);
          return (
            <div className="cp-group" key={g.id}>
              <div className="cp-head">
                <label className="cp-cat">
                  <TriStateBox checked={on === ids.length} indeterminate={on > 0 && on < ids.length} onChange={(v) => toggle(ids, v)} />
                  <span className="sw" style={{ background: g.color }} />
                  <span className="nm">{g.name}</span>
                  <span className="cp-meta">
                    {on > 0 && on < ids.length ? `${on} of ${ids.length}` : ids.length} ·{" "}
                    {fmtCents(g.expenses.reduce((s, x) => s + Number(x.budgeted_cents), 0))}
                  </span>
                </label>
                <button
                  type="button"
                  className="icon-btn cp-toggle"
                  aria-expanded={isOpen}
                  aria-controls={`cp-items-${g.id}`}
                  aria-label={`${isOpen ? "Hide" : "Show"} ${g.name} expenses`}
                  onClick={() => toggleOpen(g.id)}
                >
                  <IconDown />
                </button>
              </div>
              <div id={`cp-items-${g.id}`} hidden={!isOpen}>
                {g.expenses.map((x) => (
                  <label className="cp-item" key={x.id}>
                    <input type="checkbox" checked={selected.has(x.id)} onChange={(e) => toggle([x.id], e.target.checked)} />
                    <span className="nm">{x.name}</span>
                    <span className="cp-meta">
                      {fmtCents(Number(x.budgeted_cents))} · due {fmtDue(shiftDue(x.due_date, month))}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <label className="check">
        <input type="checkbox" checked={withActual} onChange={(e) => setWithActual(e.target.checked)} /> Also copy actual amounts
      </label>
      <span className="hint-line">Leave this off to start each copied expense at ₱0.00 spent.</span>
      <div className="err" role="alert">{err}</div>
      <div className="modal-actions">
        <button type="button" className="btn ghost" disabled={busy} onClick={() => create([])}>Start empty</button>
        <button id="cp-go" type="button" className="btn primary" aria-busy={busy} disabled={busy} onClick={() => create(Array.from(selected))}>
          {n ? `Create with ${plural(n, "expense")}` : "Create empty tracker"}
        </button>
      </div>
    </Modal>
  );
}

function TriStateBox({ checked, indeterminate, onChange }: { checked: boolean; indeterminate: boolean; onChange: (v: boolean) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      aria-checked={indeterminate ? "mixed" : checked}
      onChange={(e) => onChange(indeterminate ? true : e.target.checked)}
    />
  );
}
