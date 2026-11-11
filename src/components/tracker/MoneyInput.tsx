"use client";

import { useLayoutEffect, useRef } from "react";
import { centsToInput, cleanMoneyInput, inputToCents } from "@/lib/format";

/**
 * Peso amount field (PRD §6.3.6): ₱ prefix, thousands separators while typing with the caret kept in place,
 * digits and one decimal point, at most 2 decimals and 12 integer digits, formatted to 2 decimals on blur.
 */
export function MoneyInput({
  id,
  value,
  onChange,
  invalid,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (caret.current == null || !ref.current || document.activeElement !== ref.current) return;
    try {
      ref.current.setSelectionRange(caret.current, caret.current);
    } catch {}
    caret.current = null;
  });

  return (
    <div className="money">
      <span aria-hidden="true">₱</span>
      <input
        ref={ref}
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        value={value}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          const raw = e.target.value;
          const pos = e.target.selectionStart ?? raw.length;
          const before = raw.slice(0, pos).replace(/[^\d.]/g, "").length;
          const out = cleanMoneyInput(raw);
          let n = 0;
          let p = 0;
          while (p < out.length && n < before) {
            if (/[\d.]/.test(out[p])) n++;
            p++;
          }
          caret.current = p;
          onChange(out);
        }}
        onBlur={() => {
          if (value.trim() === "") return;
          const cents = inputToCents(value);
          if (Number.isFinite(cents)) onChange(centsToInput(cents));
        }}
      />
    </div>
  );
}
