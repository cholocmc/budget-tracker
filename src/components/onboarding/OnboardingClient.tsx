"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Avatar } from "@/components/Avatar";
import { Footer } from "@/components/Footer";
import { IconArrow, IconCheck, IconCopy, IconHome, IconInfo, IconKey, LogoMark } from "@/components/Icons";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { useToast } from "@/components/Toast";
import { codeMessage, errorCode, errorMessage } from "@/lib/errors";
import { currentMonthLabel, formatCodeInput, memberColor, plural } from "@/lib/format";
import { getSupabase } from "@/lib/supabase/client";

type Mode = "create" | "join";
type Found = { name: string; owner_name: string; member_count: number; members: { display_name: string; avatar_url: string | null }[] };
type View =
  | { kind: "choose" }
  | { kind: "found"; code: string; found: Found }
  | { kind: "created"; name: string; code: string }
  | { kind: "joined"; name: string };

function Stepper({ done }: { done: boolean }) {
  return (
    <ol className="stepper" aria-label="Setup progress">
      <li className="done">
        <span className="dot"><IconCheck className="i" /></span>Signed in
      </li>
      <li className="bar" aria-hidden="true" />
      <li className={done ? "done" : "now"} aria-current={done ? undefined : "step"}>
        <span className="dot">{done ? <IconCheck className="i" /> : "2"}</span>Household
      </li>
    </ol>
  );
}

export function OnboardingClient({
  userName,
  userAvatarUrl,
  initialMode,
}: {
  userName: string;
  userAvatarUrl: string | null;
  initialMode: Mode;
}) {
  const supabase = getSupabase();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [view, setView] = useState<View>({ kind: "choose" });
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [month, setMonth] = useState("");
  const [copied, setCopied] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => setMonth(currentMonthLabel()), []);
  useEffect(() => {
    if (!focusId) return;
    document.getElementById(focusId)?.focus();
    setFocusId(null);
  }, [focusId, view, mode]);

  const choose = (m: Mode, focusInput: boolean) => {
    setMode(m);
    setError("");
    setFocusId(focusInput ? (m === "create" ? "hh-name" : "hh-code") : `choice-${m}`);
  };
  const onTileKey = (e: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    choose(mode === "create" ? "join" : "create", false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.assign("/signed-out");
  };

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Enter a household name with at least 2 characters.");
      setFocusId("hh-name");
      return;
    }
    setBusy(true);
    const { data, error: err } = await supabase.rpc("create_household", { p_name: trimmed });
    setBusy(false);
    if (err) {
      if (errorCode(err) === "ALREADY_IN_HOUSEHOLD") {
        window.location.assign("/tracker");
        return;
      }
      setError(errorMessage(err));
      return;
    }
    setView({ kind: "created", name: data.name, code: data.code });
    setFocusId("copy");
  };

  const submitLookup = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const formatted = formatCodeInput(code);
    const raw = formatted.replace("-", "");
    if (raw.length !== 8) {
      setError("Household codes have 8 characters, like K7QM-XR4D.");
      setFocusId("hh-code");
      return;
    }
    if (/[01OI]/.test(raw)) {
      setError("Codes never use 0, O, 1, or I. Double-check those characters with the person who sent it.");
      setFocusId("hh-code");
      return;
    }
    setBusy(true);
    const { data, error: err } = await supabase.rpc("lookup_household", { p_code: formatted });
    setBusy(false);
    if (err || data?.error) {
      setError(err ? errorMessage(err) : codeMessage(data.error));
      setFocusId("hh-code");
      return;
    }
    setView({ kind: "found", code: formatted, found: data as Found });
    setFocusId("confirm-join");
  };

  const confirmJoin = async () => {
    if (busy || view.kind !== "found") return;
    setBusy(true);
    const { data, error: err } = await supabase.rpc("join_household", { p_code: view.code });
    setBusy(false);
    if (err || data?.error) {
      if (err && errorCode(err) === "ALREADY_IN_HOUSEHOLD") {
        window.location.assign("/tracker");
        return;
      }
      // The code may have been reset while the user was confirming (PRD §7).
      setView({ kind: "choose" });
      setMode("join");
      setError(err ? errorMessage(err) : codeMessage(data.error));
      setFocusId("hh-code");
      return;
    }
    setView({ kind: "joined", name: data.name });
  };

  const copyCode = async (value: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast("Household code copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      if (codeRef.current) {
        const range = document.createRange();
        range.selectNodeContents(codeRef.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      toast("Code selected. Copy it with your keyboard or long-press.");
    }
  };

  return (
    <div className="pg-onboarding">
      <div className="owrap">
        <div className="otop">
          <div className="obrand">
            <LogoMark />
            Budget Mate
          </div>
          <div className="top-right">
            <div className="account">
              <Avatar className="avi" name={userName || "G"} url={userAvatarUrl} decorative />
              <span className="who">Signed in with Google</span>
              <button type="button" onClick={signOut}>Sign out</button>
            </div>
            <ThemeSwitch />
          </div>
        </div>
      </div>

      <main className="owrap">
        <div className="card">
          {view.kind === "choose" && (
            <>
              <Stepper done={false} />
              <div className="intro">
                <h1>Set up your household</h1>
                <p>Your budget lives in a household. Start a new one, or join one that someone already shared with you.</p>
              </div>
              <div className="choices" role="radiogroup" aria-label="How do you want to start?">
                {(
                  [
                    ["create", <IconHome key="h" />, "Create a household", "You'll be the owner and get a code to share."],
                    ["join", <IconKey key="k" />, "Join with a code", "Paste the household code a member sent you."],
                  ] as const
                ).map(([m, icon, title, desc]) => (
                  <button
                    key={m}
                    id={`choice-${m}`}
                    type="button"
                    className="choice"
                    role="radio"
                    aria-checked={mode === m}
                    tabIndex={mode === m ? 0 : -1}
                    onClick={() => choose(m, true)}
                    onKeyDown={onTileKey}
                  >
                    <span className="radio" aria-hidden="true" />
                    <span className="ico">{icon}</span>
                    <b>{title}</b>
                    <span className="d">{desc}</span>
                  </button>
                ))}
              </div>

              {mode === "create" ? (
                <form onSubmit={submitCreate} noValidate>
                  <div className="field">
                    <label htmlFor="hh-name">Household name</label>
                    <input
                      id="hh-name"
                      maxLength={50}
                      autoComplete="off"
                      placeholder="e.g. Santos Family"
                      value={name}
                      aria-invalid={!!error || undefined}
                      aria-describedby="hh-hint hh-err"
                      onChange={(e) => {
                        setName(e.target.value);
                        setError("");
                      }}
                    />
                    <span className="hint" id="hh-hint">Every member sees this name. You can change it later.</span>
                  </div>
                  <div className="err" id="hh-err" role="alert">{error}</div>
                  <div className="oactions">
                    <button className="btn primary" type="submit" aria-busy={busy} disabled={busy}>
                      {busy ? "Creating…" : "Create household"}
                      <span className="spin" aria-hidden="true" />
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={submitLookup} noValidate>
                  <div className="field">
                    <label htmlFor="hh-code">Household code</label>
                    <input
                      id="hh-code"
                      className="code-input"
                      maxLength={9}
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      inputMode="text"
                      placeholder="XXXX-XXXX"
                      value={code}
                      aria-invalid={!!error || undefined}
                      aria-describedby="code-hint code-err"
                      onChange={(e) => {
                        setCode(formatCodeInput(e.target.value));
                        setError("");
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        setCode(formatCodeInput(e.clipboardData.getData("text")));
                        setError("");
                      }}
                    />
                    <span className="hint" id="code-hint">8 characters. Ask any member for it. It&apos;s under Invite in their tracker.</span>
                  </div>
                  <div className="err" id="code-err" role="alert">{error}</div>
                  <div className="oactions">
                    <button className="btn primary" type="submit" aria-busy={busy} disabled={busy}>
                      {busy ? "Looking up…" : "Find household"}
                      <span className="spin" aria-hidden="true" />
                    </button>
                  </div>
                </form>
              )}
              <div className="rule">
                <IconInfo />
                <span>You can belong to one household at a time. To switch later, leave your current household first.</span>
              </div>
            </>
          )}

          {view.kind === "found" && (
            <>
              <Stepper done={false} />
              <div className="intro">
                <h1>Join this household?</h1>
                <p>Check that this is the household you expected before joining.</p>
              </div>
              <div className="found">
                <span className="eyebrow">Code {view.code}</span>
                <h3>{view.found.name}</h3>
                <div className="meta">
                  <span className="avs">
                    {view.found.members.map((m, i) => (
                      <Avatar key={i} className="" name={m.display_name} url={m.avatar_url} color={memberColor(i)} title={m.display_name} />
                    ))}
                  </span>
                  {plural(view.found.member_count, "member")} · Owned by {view.found.owner_name}
                </div>
              </div>
              <p style={{ color: "var(--muted)", fontSize: 14 }}>
                As a member you can view, add, edit, and delete everything in this household&apos;s trackers.
              </p>
              <div className="oactions">
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => {
                    setView({ kind: "choose" });
                    setMode("join");
                    setFocusId("hh-code");
                  }}
                >
                  Use a different code
                </button>
                <button id="confirm-join" className="btn primary" type="button" aria-busy={busy} disabled={busy} onClick={confirmJoin}>
                  {busy ? "Joining…" : `Join ${view.found.name}`}
                  <span className="spin" aria-hidden="true" />
                </button>
              </div>
            </>
          )}

          {(view.kind === "created" || view.kind === "joined") && (
            <>
              <Stepper done />
              <div className="success">
                <span className="badge"><IconCheck className="i" /></span>
                <h2>{view.kind === "created" ? `${view.name} is ready` : `You joined ${view.name}`}</h2>
                <p>
                  {view.kind === "created"
                    ? `Your first tracker opens on ${month}. Share this code with the people who split your bills so they can join.`
                    : `You now share every monthly tracker in ${view.name}. ${month} is waiting for you.`}
                </p>
                {view.kind === "created" && (
                  <div className="code-box">
                    <span className="eyebrow">Household code</span>
                    <code className="hh-code" ref={codeRef}>{view.code}</code>
                    <button id="copy" className="btn" type="button" onClick={() => copyCode(view.code)}>
                      <IconCopy />
                      <span>{copied ? "Copied" : "Copy code"}</span>
                    </button>
                  </div>
                )}
                <div className="oactions">
                  <a className="btn primary" href="/tracker">
                    Open my tracker <IconArrow />
                  </a>
                </div>
                {view.kind === "created" && <p className="hint">You can find this code again under Invite in your tracker.</p>}
              </div>
            </>
          )}
        </div>
      </main>

      <Footer className="ofoot owrap" />
    </div>
  );
}
