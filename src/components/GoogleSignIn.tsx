"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { IconSignIn } from "./Icons";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/* ---------- Google Identity Services (official button), used when a client ID is configured ---------- */

type GisCredential = { credential: string };
type GoogleAccountsId = {
  initialize: (opts: Record<string, unknown>) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

type Listener = (state: { busy: boolean; error: string | null }) => void;
const listeners = new Set<Listener>();
const emit = (s: { busy: boolean; error: string | null }) => listeners.forEach((l) => l(s));

let gisReady: Promise<void> | null = null;
let rawNonce = "";

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function loadGis(): Promise<void> {
  if (gisReady) return gisReady;
  gisReady = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onerror = () => {
      gisReady = null;
      reject(new Error("Couldn't load Google sign-in."));
    };
    script.onload = async () => {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      rawNonce = btoa(String.fromCharCode(...bytes));
      const hashed = await sha256Hex(rawNonce);
      window.google!.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        nonce: hashed,
        use_fedcm_for_prompt: true,
        callback: async (resp: GisCredential) => {
          emit({ busy: true, error: null });
          const { error } = await getSupabase().auth.signInWithIdToken({
            provider: "google",
            token: resp.credential,
            nonce: rawNonce,
          });
          if (error) {
            emit({ busy: false, error: "Google sign-in didn't finish. Try again." });
            return;
          }
          // The proxy sends the user to the tracker or onboarding based on membership.
          window.location.assign("/tracker");
        },
      });
      resolve();
    };
    document.head.appendChild(script);
  });
  return gisReady;
}

function GisButton() {
  const slot = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });

  useEffect(() => {
    listeners.add(setState);
    let alive = true;
    let ready = false;
    let rendered: boolean | null = null;
    const mq = matchMedia("(prefers-color-scheme: light)");

    // Google's button is an iframe that can't read our CSS, so pick its theme here and
    // re-render it whenever the page theme flips (switch, system change, or another tab).
    const render = () => {
      if (!alive || !ready || !slot.current) return;
      const attr = document.documentElement.getAttribute("data-theme");
      const light = attr ? attr === "light" : mq.matches;
      if (light === rendered) return;
      rendered = light;
      slot.current.replaceChildren();
      window.google!.accounts.id.renderButton(slot.current, {
        type: "standard",
        theme: light ? "outline" : "filled_black",
        size: "large",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "left",
        width: 280,
      });
    };

    const observer = new MutationObserver(render);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    mq.addEventListener?.("change", render);

    loadGis()
      .then(() => {
        ready = true;
        render();
      })
      .catch((e: Error) => alive && setState({ busy: false, error: e.message }));
    return () => {
      alive = false;
      observer.disconnect();
      mq.removeEventListener?.("change", render);
      listeners.delete(setState);
    };
  }, []);

  return (
    <>
      <div className="gis-slot" ref={slot} aria-busy={state.busy} />
      <p className={`signin-note${state.error ? " bad" : ""}`} role="status" aria-live="polite">
        {state.busy ? "Signing you in…" : state.error}
      </p>
    </>
  );
}

/* ---------- Supabase OAuth redirect (fallback when no Google client ID is configured) ---------- */

function OAuthButton({ initialError }: { initialError?: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const signIn = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setBusy(false);
      setError("Couldn't reach Google. Check your connection and try again.");
    }
    // On success the browser navigates away to Google.
  };

  return (
    <>
      <button type="button" className="google-btn" aria-busy={busy} onClick={signIn}>
        <span className="g" aria-hidden="true">
          <IconSignIn className="" />
        </span>
        <span>{busy ? "Connecting to Google…" : "Continue with Google"}</span>
        <span className="spin" aria-hidden="true" />
      </button>
      <p className={`signin-note${error ? " bad" : ""}`} role="status" aria-live="polite">
        {error}
      </p>
    </>
  );
}

export function GoogleSignIn({ initialError }: { initialError?: string | null }) {
  return GOOGLE_CLIENT_ID ? <GisButton /> : <OAuthButton initialError={initialError} />;
}
