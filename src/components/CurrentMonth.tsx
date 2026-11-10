"use client";

import { useEffect, useState } from "react";
import { currentMonthLabel } from "@/lib/format";

/** "{Month Year}" in the viewer's local time zone (the server may be in another one). */
export function CurrentMonth() {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => setLabel(currentMonthLabel()), []);
  return <span suppressHydrationWarning>{label ?? " "}</span>;
}
