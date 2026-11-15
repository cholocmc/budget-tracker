"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const GAP = 8;
const EDGE = 8;

/**
 * A label with a short explanation (KPIs, table headers). Shows on mouse hover, on keyboard focus, and on tap;
 * Esc, scrolling, or tapping elsewhere hides it. The text is also wired to aria-describedby, so screen readers
 * get it without the visual tooltip. Rendered in a portal so scroll containers don't clip it.
 */
export function Term({ children, tip }: { children: ReactNode; tip: string }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  // Place it under the label, centered and kept inside the viewport; flip above when there's no room below.
  useLayoutEffect(() => {
    const t = trigger.current;
    const b = bubble.current;
    if (!open || !t || !b) return;
    const r = t.getBoundingClientRect();
    const w = b.offsetWidth;
    const h = b.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const left = Math.min(Math.max(r.left + r.width / 2 - w / 2, EDGE), vw - w - EDGE);
    const below = r.bottom + GAP + h <= window.innerHeight - EDGE;
    b.style.left = `${left}px`;
    b.style.top = `${below ? r.bottom + GAP : r.top - GAP - h}px`;
    b.dataset.ready = "";
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const hide = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    const onDown = (e: PointerEvent) => {
      if (!trigger.current?.contains(e.target as Node)) hide();
    };
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="term"
        aria-describedby={id}
        onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
        // Keyboard focus only; a tap focuses too, but the click below handles taps.
        onFocus={(e) => e.currentTarget.matches(":focus-visible") && setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          // Mouse users already see it on hover; a click shouldn't hide it.
          if ((e.nativeEvent as PointerEvent).pointerType !== "mouse") setOpen((o) => !o);
        }}
      >
        {children}
      </button>
      <span id={id} className="sr-only">{tip}</span>
      {open &&
        createPortal(
          <span ref={bubble} className="tooltip" aria-hidden="true">
            {tip}
          </span>,
          document.body,
        )}
    </>
  );
}
