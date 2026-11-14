"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Avatar } from "@/components/Avatar";
import { Footer } from "@/components/Footer";
import { IconCheck, IconClose, IconEdit, IconLeft, IconLock, IconLogout, IconPlus, IconTrash, LogoMark } from "@/components/Icons";
import { Modal } from "@/components/Modal";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { useToast } from "@/components/Toast";
import { MoneyInput } from "@/components/tracker/MoneyInput";
import { BANK_ACCOUNT_COLUMNS, fetchBankAccounts, normalizeBankAccount } from "@/lib/data";
import { errorCode, errorMessage } from "@/lib/errors";
import { centsToInput, fmtCents, fmtSince, initials, inputToCents, PALETTE, PALETTE_NAMES, plural } from "@/lib/format";
import { getSupabase } from "@/lib/supabase/client";
import type { BankAccount, Role } from "@/lib/types";

/* Profile page (PRD §6.7): the signed-in user's private list of bank and e-wallet balances. */

type SortKey = "balance" | "name" | "updated";
type Dialog = { kind: "form"; id?: string } | { kind: "delete"; id: string };
type AccountInput = { name: string; balance_cents: number; color: string };

const CONFLICT = "This account changed in another tab. Showing the latest balance.";
const TMP = "tmp-";
const isTmp = (a: BankAccount) => a.id.startsWith(TMP);
const dupMessage = (name: string) => `You already have an account called ${name}.`;
/** "BDO" -> "BD", "Union Bank" -> "UB". */
const tileText = (name: string) => (/\s/.test(name.trim()) ? initials(name) : name.trim().slice(0, 2).toUpperCase());
const shareOf = (cents: number, total: number) => (total > 0 ? (cents / total) * 100 : 0);

export function ProfileApp({
  name,
  avatarColor,
  avatarUrl,
  household,
  initialAccounts,
}: {
  name: string;
  avatarColor: string;
  avatarUrl: string | null;
  household: { name: string; role: Role } | null;
  initialAccounts: BankAccount[] | null;
}) {
  const toast = useToast();
  const [accounts, setAccounts] = useState<BankAccount[]>(initialAccounts ?? []);
  const [loadFailed, setLoadFailed] = useState(initialAccounts === null);
  const [sort, setSort] = useState<SortKey>("balance");
  const [editing, setEditing] = useState<{ id: string; value: string; invalid?: boolean } | null>(null);
  const [hl, setHl] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  // Relative dates depend on the viewer's clock and time zone, so they render only after mount.
  const [now, setNow] = useState<Date | null>(null);
  const accountsRef = useRef(accounts);
  accountsRef.current = accounts;
  const editRef = useRef<HTMLDivElement>(null);
  const focusBalance = useRef<string | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (editing) {
      const input = editRef.current?.querySelector("input");
      if (input && document.activeElement !== input) {
        input.focus();
        input.select();
      }
    } else if (focusBalance.current) {
      document.querySelector<HTMLElement>(`[data-bal="${focusBalance.current}"]`)?.focus();
      focusBalance.current = null;
    }
  }, [editing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = useMemo(() => accounts.reduce((s, a) => s + a.balance_cents, 0), [accounts]);
  const byBalance = useMemo(() => [...accounts].sort((a, b) => b.balance_cents - a.balance_cents || a.name.localeCompare(b.name)), [accounts]);
  const sorted = useMemo(() => {
    if (sort === "balance") return byBalance;
    const list = [...accounts];
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    else list.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return list;
  }, [accounts, byBalance, sort]);
  const lastUpdated = accounts.reduce<string | null>((m, a) => (!m || a.updated_at > m ? a.updated_at : m), null);

  const replace = (id: string, next: BankAccount) => setAccounts((list) => list.map((a) => (a.id === id ? next : a)));

  const reload = useCallback(async () => {
    const fresh = await fetchBankAccounts(getSupabase());
    if (fresh) {
      setAccounts(fresh);
      setLoadFailed(false);
    }
    return fresh;
  }, []);

  /* ---------- Writes: optimistic, rolled back on error, guarded by updated_at ---------- */

  async function saveBalance(original: BankAccount, cents: number) {
    focusBalance.current = original.id;
    setEditing(null);
    if (cents === original.balance_cents) return;
    replace(original.id, { ...original, balance_cents: cents });
    const { data, error } = await getSupabase()
      .from("bank_accounts")
      .update({ balance_cents: cents })
      .eq("id", original.id)
      .eq("updated_at", original.updated_at)
      .select(BANK_ACCOUNT_COLUMNS);
    if (error) {
      replace(original.id, original);
      return toast(errorMessage(error));
    }
    if (!data?.length) {
      await reload();
      return toast(CONFLICT);
    }
    replace(original.id, normalizeBankAccount(data[0]));
    toast(`Updated ${original.name} to ${fmtCents(cents)}`);
  }

  /** Returns an error message for the dialog, or null when it can close. */
  async function saveAccount(input: AccountInput, original?: BankAccount): Promise<string | null> {
    if (accountsRef.current.some((a) => a.name.toLowerCase() === input.name.toLowerCase() && a.id !== original?.id)) {
      return dupMessage(input.name);
    }
    const sb = getSupabase();

    if (original) {
      if (input.name === original.name && input.balance_cents === original.balance_cents && input.color === original.color) return null;
      replace(original.id, { ...original, ...input });
      const { data, error } = await sb
        .from("bank_accounts")
        .update(input)
        .eq("id", original.id)
        .eq("updated_at", original.updated_at)
        .select(BANK_ACCOUNT_COLUMNS);
      if (error) {
        replace(original.id, original);
        return errorCode(error) === "UNIQUE" ? dupMessage(input.name) : errorMessage(error);
      }
      if (!data?.length) {
        await reload();
        toast(CONFLICT);
        return null;
      }
      replace(original.id, normalizeBankAccount(data[0]));
      toast(`Saved ${input.name}`);
      return null;
    }

    const stamp = new Date().toISOString();
    const tmp: BankAccount = { id: `${TMP}${crypto.randomUUID()}`, ...input, created_at: stamp, updated_at: stamp };
    setAccounts((list) => [...list, tmp]);
    const { data, error } = await sb.from("bank_accounts").insert(input).select(BANK_ACCOUNT_COLUMNS).single();
    if (error || !data) {
      setAccounts((list) => list.filter((a) => a.id !== tmp.id));
      return errorCode(error) === "UNIQUE" ? dupMessage(input.name) : errorMessage(error);
    }
    replace(tmp.id, normalizeBankAccount(data));
    toast(`Added ${input.name}`);
    return null;
  }

  async function deleteAccount(account: BankAccount) {
    setDialog(null);
    setAccounts((list) => list.filter((a) => a.id !== account.id));
    const { error } = await getSupabase().from("bank_accounts").delete().eq("id", account.id);
    if (error) {
      setAccounts((list) => (list.some((a) => a.id === account.id) ? list : [...list, account]));
      return toast(errorMessage(error));
    }
    toast(`Deleted ${account.name}`);
  }

  async function signOut() {
    await getSupabase().auth.signOut();
    window.location.assign("/signed-out");
  }

  function commitInline(account: BankAccount) {
    if (!editing) return;
    const cents = editing.value.trim() === "" ? 0 : inputToCents(editing.value);
    if (!Number.isFinite(cents) || cents < 0) return setEditing({ ...editing, invalid: true });
    void saveBalance(account, cents);
  }

  function cancelInline(id: string) {
    focusBalance.current = id;
    setEditing(null);
  }

  const dialogAccount = dialog?.id ? accounts.find((a) => a.id === dialog.id) : undefined;
  const top = byBalance.slice(0, 4);
  const rest = byBalance.slice(4);
  const restCents = rest.reduce((s, a) => s + a.balance_cents, 0);

  return (
    <div className="wrap pg-profile">
      <header className="top">
        <div className="brand">
          <Link
            href={household ? "/tracker" : "/onboarding"}
            className="icon-btn back-btn"
            aria-label={household ? "Back to tracker" : "Back"}
            title={household ? "Back to tracker" : "Back"}
          >
            <IconLeft />
          </Link>
          <LogoMark />
          <div style={{ minWidth: 0 }}>
            <div className="sub">{household ? `${household.name} · Budget tracker` : "Budget Mate"}</div>
            <h1>Profile</h1>
          </div>
        </div>
        <div className="members">
          <ThemeSwitch />
          <button type="button" className="btn ghost signout" aria-label="Sign out" title="Sign out" onClick={() => void signOut()}>
            <IconLogout />
            <span className="lbl">Sign out</span>
          </button>
        </div>
      </header>

      <div className="profile-cols">
        <aside className="panel me-card" aria-label="You">
          <div className="who">
            <Avatar name={name} url={avatarUrl} color={avatarColor} decorative />
            <div style={{ minWidth: 0 }}>
              <div className="who-name">{name}</div>
              <div className="who-meta">
                {household ? `${household.role === "owner" ? "Owner" : "Member"} of ${household.name}` : "Not in a household"}
              </div>
            </div>
          </div>

          <div className="total">
            <span className="eyebrow">Total balance</span>
            <span className="total-val">{fmtCents(total)}</span>
            <span className="total-foot">
              {accounts.length
                ? `Across ${plural(accounts.length, "account")}${now && lastUpdated ? ` · last updated ${fmtSince(lastUpdated, now)}` : ""}`
                : "Add an account to see your total"}
            </span>
          </div>

          {total > 0 && (
            <>
              <div className="dist" aria-hidden="true">
                {byBalance
                  .filter((a) => a.balance_cents > 0)
                  .map((a) => (
                    <span
                      key={a.id}
                      className={hl && hl !== a.id ? "dim" : ""}
                      style={{ flexGrow: shareOf(a.balance_cents, total), background: a.color }}
                    />
                  ))}
              </div>
              <ul className="dist-legend" aria-label="Share of your total">
                {top.map((a) => (
                  <li key={a.id}>
                    <span className="sw" style={{ background: a.color }} />
                    <span className="nm">{a.name}</span>
                    <span className="p">{shareOf(a.balance_cents, total).toFixed(1)}%</span>
                  </li>
                ))}
                {rest.length > 0 && (
                  <li>
                    <span className="sw" style={{ background: "var(--line-strong)" }} />
                    <span className="nm">{rest.length === 1 ? rest[0].name : `${rest.length} others`}</span>
                    <span className="p">{shareOf(restCents, total).toFixed(1)}%</span>
                  </li>
                )}
              </ul>
            </>
          )}

          <div className="private-note">
            <IconLock />
            <span>{household ? `Only you can see your accounts. Other members of ${household.name} can't.` : "Nobody else can see your accounts."}</span>
          </div>
        </aside>

        <section className="panel acc-panel" aria-labelledby="acc-h">
          <div className="panel-head">
            <div style={{ minWidth: 0 }}>
              <h2 id="acc-h">Accounts</h2>
              <p className="panel-sub">Banks and e-wallets you keep money in. Tap a balance to update it.</p>
            </div>
            <div className="acc-tools">
              {accounts.length > 1 && (
                <>
                  <label className="sr-only" htmlFor="acc-sort">Sort accounts</label>
                  <select id="acc-sort" className="select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                    <option value="balance">Highest balance</option>
                    <option value="name">Name A–Z</option>
                    <option value="updated">Recently updated</option>
                  </select>
                </>
              )}
              {!loadFailed && (
                <button type="button" className="btn primary" onClick={() => setDialog({ kind: "form" })}>
                  <IconPlus />
                  <span className="lbl">Add account</span>
                </button>
              )}
            </div>
          </div>

          {loadFailed ? (
            <div className="empty">
              <h2>Couldn&apos;t load your accounts</h2>
              <p>Check your connection, then try again.</p>
              <button type="button" className="btn primary" onClick={() => void reload().then((r) => !r && toast(errorMessage(null)))}>
                Try again
              </button>
            </div>
          ) : accounts.length === 0 ? (
            <div className="empty">
              <h2>No accounts yet</h2>
              <p>Add the banks and e-wallets you use to see your total balance in one place.</p>
              <button type="button" className="btn primary" onClick={() => setDialog({ kind: "form" })}>
                <IconPlus />
                Add account
              </button>
            </div>
          ) : (
            <ul className="acc-list" onMouseLeave={() => setHl(null)}>
              {sorted.map((a) => {
                const pct = shareOf(a.balance_cents, total);
                const pending = isTmp(a);
                const isEditing = editing?.id === a.id;
                return (
                  <li key={a.id} className={hl === a.id ? "on" : undefined} onMouseEnter={() => setHl(a.id)}>
                    <span className="acc-tile" style={{ background: a.color }} aria-hidden="true">{tileText(a.name)}</span>
                    <div className="acc-name">
                      <span className="nm">{a.name}</span>
                      <span className="meta">{pending ? "Saving…" : now ? `Updated ${fmtSince(a.updated_at, now)}` : " "}</span>
                    </div>
                    <div className="acc-share" title={`${pct.toFixed(1)}% of your total`}>
                      <span className="share-bar"><i style={{ width: `${pct}%`, background: a.color }} /></span>
                      <span className="pct">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="acc-bal">
                      {isEditing ? (
                        <div
                          className="bal-edit"
                          ref={editRef}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitInline(a);
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              cancelInline(a.id);
                            }
                          }}
                        >
                          <label className="sr-only" htmlFor="bal-inline">New balance for {a.name}</label>
                          <MoneyInput
                            id="bal-inline"
                            value={editing.value}
                            invalid={editing.invalid}
                            onChange={(v) => setEditing({ id: a.id, value: v })}
                          />
                          <button type="button" className="icon-btn ok" aria-label="Save balance" title="Save" onClick={() => commitInline(a)}>
                            <IconCheck />
                          </button>
                          <button type="button" className="icon-btn" aria-label="Cancel" title="Cancel" onClick={() => cancelInline(a.id)}>
                            <IconClose />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="bal-btn"
                          data-bal={a.id}
                          disabled={pending}
                          aria-label={`Update ${a.name} balance, now ${fmtCents(a.balance_cents)}`}
                          onClick={() => setEditing({ id: a.id, value: centsToInput(a.balance_cents) })}
                        >
                          {fmtCents(a.balance_cents)}
                          <IconEdit />
                        </button>
                      )}
                    </div>
                    <div className="row-actions">
                      {!isEditing && (
                        <>
                          <button type="button" className="icon-btn" aria-label={`Edit ${a.name}`} title="Edit" disabled={pending} onClick={() => setDialog({ kind: "form", id: a.id })}>
                            <IconEdit />
                          </button>
                          <button type="button" className="icon-btn del" aria-label={`Delete ${a.name}`} title="Delete" disabled={pending} onClick={() => setDialog({ kind: "delete", id: a.id })}>
                            <IconTrash />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <Footer />

      {dialog?.kind === "form" && (dialog.id ? dialogAccount : true) && (
        <AccountDialog
          account={dialogAccount}
          usedColors={accounts.map((a) => a.color)}
          onClose={() => setDialog(null)}
          onSave={saveAccount}
        />
      )}
      {dialog?.kind === "delete" && dialogAccount && (
        <DeleteAccountDialog account={dialogAccount} total={total} onClose={() => setDialog(null)} onConfirm={() => void deleteAccount(dialogAccount)} />
      )}
    </div>
  );
}

/* ---------- Account dialog (add and edit) ---------- */
function AccountDialog({
  account,
  usedColors,
  onClose,
  onSave,
}: {
  account?: BankAccount;
  usedColors: string[];
  onClose: () => void;
  onSave: (input: AccountInput, original?: BankAccount) => Promise<string | null>;
}) {
  // Keep the row as it was when the dialog opened, for the updated_at guard.
  const [original] = useState(account);
  const [name, setName] = useState(account?.name ?? "");
  const [balance, setBalance] = useState(account ? centsToInput(account.balance_cents) : "");
  const [color, setColor] = useState(account?.color ?? (PALETTE.find((c) => !usedColors.includes(c)) || PALETTE[usedColors.length % PALETTE.length]));
  const [err, setErr] = useState("");
  const [badField, setBadField] = useState<"name" | "balance" | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = name.trim();
    if (!v) {
      setBadField("name");
      return setErr("Enter a name for this account.");
    }
    const cents = balance.trim() === "" ? 0 : inputToCents(balance);
    if (!Number.isFinite(cents) || cents < 0) {
      setBadField("balance");
      return setErr("Amounts must be zero or more.");
    }
    setBusy(true);
    const error = await onSave({ name: v, balance_cents: cents, color }, original);
    setBusy(false);
    if (error) {
      setBadField(error.startsWith("You already have") ? "name" : null);
      return setErr(error);
    }
    onClose();
  };

  return (
    <Modal title={original ? `Edit ${original.name}` : "Add account"} onClose={onClose}>
      <p>{original ? "Changes show up in your total right away." : "Add a bank or e-wallet and how much is in it right now."}</p>
      <form className="form" onSubmit={submit} noValidate>
        <div className="field full">
          <label htmlFor="acc-name">Account name</label>
          <input
            id="acc-name"
            maxLength={40}
            value={name}
            placeholder="e.g. BPI Savings"
            autoComplete="off"
            aria-invalid={badField === "name" || undefined}
            onChange={(e) => {
              setName(e.target.value);
              setErr("");
              setBadField(null);
            }}
          />
        </div>
        <div className="field full">
          <label htmlFor="acc-balance">Balance</label>
          <MoneyInput
            id="acc-balance"
            value={balance}
            invalid={badField === "balance"}
            onChange={(v) => {
              setBalance(v);
              setErr("");
              setBadField(null);
            }}
          />
        </div>
        <div className="field full">
          <span className="label" id="acc-color-label">Color</span>
          <div className="swatches" role="group" aria-labelledby="acc-color-label">
            {PALETTE.map((c, i) => (
              <button
                key={c}
                type="button"
                style={{ background: c }}
                aria-label={PALETTE_NAMES[i] ?? `Color ${i + 1}`}
                title={PALETTE_NAMES[i]}
                aria-pressed={c === color}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
        <div className="err field full" role="alert">{err}</div>
        <div className="modal-actions field full">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={busy}>{original ? "Save" : "Add account"}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Delete confirmation ---------- */
function DeleteAccountDialog({
  account,
  total,
  onClose,
  onConfirm,
}: {
  account: BankAccount;
  total: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [snap] = useState({ account, total });
  return (
    <Modal title={`Delete ${snap.account.name}?`} onClose={onClose} variant="danger" initialFocus="#acc-keep">
      <div className="warn-box">
        <strong>This can&apos;t be undone.</strong> {snap.account.name} and its {fmtCents(snap.account.balance_cents)} balance come off your
        profile. Your total goes from {fmtCents(snap.total)} to {fmtCents(snap.total - snap.account.balance_cents)}.
      </div>
      <p>This only removes it from Budget Mate. Nothing changes at your bank.</p>
      <div className="modal-actions">
        <button type="button" id="acc-keep" className="btn ghost" onClick={onClose}>Keep account</button>
        <button type="button" className="btn danger" onClick={onConfirm}>Delete account</button>
      </div>
    </Modal>
  );
}
