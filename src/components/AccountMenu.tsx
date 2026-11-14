"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { IconLogout, IconUser } from "./Icons";
import { initials } from "@/lib/format";

/**
 * Your own avatar at the end of the tracker header (PRD §6.3.1). Opens a menu with Profile and Sign out.
 * Esc and a click outside close it, arrow keys move between the items, and focus returns to the avatar.
 */
export function AccountMenu({ name, color, onSignOut }: { name: string; color: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const items = () => Array.from(wrapRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) btnRef.current?.focus();
  };

  const onMenuKey = (e: KeyboardEvent) => {
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = e.key === "ArrowDown" ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
      list[next]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      list[e.key === "Home" ? 0 : list.length - 1]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className="acct" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className="acct-btn"
        aria-label={`Account menu for ${name}`}
        title={name}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="av" style={{ background: color }}>{initials(name)}</span>
      </button>
      {open && (
        <div className="acct-menu" id={menuId} role="menu" aria-label="Account" onKeyDown={onMenuKey}>
          <div className="acct-head">
            <b>{name}</b>
            <span>Signed in with Google</span>
          </div>
          <Link href="/profile" role="menuitem" className="acct-item" onClick={() => setOpen(false)}>
            <IconUser />
            Profile
          </Link>
          <button
            type="button"
            role="menuitem"
            className="acct-item"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            <IconLogout />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
