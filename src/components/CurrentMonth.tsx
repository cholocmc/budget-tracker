"use client";

import { useEffect, useState } from "react";
import { currentMonthLabel, monthKeyInZone, monthLabel } from "@/lib/format";

/**
 * "{Month Year}" in the viewer's local time zone (the server may be in another one). Before scripts run it
 * shows the month in Manila, where nearly every user is, so headings never render with a blank gap.
 */
export function CurrentMonth() {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => setLabel(currentMonthLabel()), []);
  const manila = monthKeyInZone("Asia/Manila");
  return <span suppressHydrationWarning>{label ?? (manila ? monthLabel(manila) : "this month")}</span>;
}
