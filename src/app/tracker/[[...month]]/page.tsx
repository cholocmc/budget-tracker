import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TrackerApp } from "@/components/tracker/TrackerApp";
import { fetchCategories, fetchHousehold, fetchMembers, fetchMonthExpenses, fetchTrackers } from "@/lib/data";
import { isMonthKey, monthKeyInZone, parseMonthKey } from "@/lib/format";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { InitialData } from "@/lib/types";

export const metadata = { title: "Tracker · Monthly Budget Tracker" };

export default async function TrackerPage({ params }: { params: Promise<{ month?: string[] }> }) {
  const { month } = await params;
  const requested = month?.[0];
  if (month && (month.length > 1 || !isMonthKey(requested))) redirect("/tracker");

  const supabase = await createSupabaseServer();
  // Verified locally against the cached JWKS when the project uses asymmetric signing keys.
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) redirect("/");

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) redirect("/onboarding");

  // The bare /tracker route opens on the viewer's local current month, which only the browser knows
  // for sure. Guess it from Vercel's IP time zone so its expenses usually arrive with the page; the
  // client still picks its own month and loads it if the guess was wrong.
  const tz = (await headers()).get("x-vercel-ip-timezone");
  const prefetchedMonth = requested ?? monthKeyInZone(tz || "UTC");

  const hid = membership.household_id as string;
  const { y, m } = prefetchedMonth ? parseMonthKey(prefetchedMonth) : { y: 0, m: 0 };
  const [household, members, categories, trackers, initialExpenses] = await Promise.all([
    fetchHousehold(supabase, hid),
    fetchMembers(supabase, hid),
    fetchCategories(supabase, hid),
    fetchTrackers(supabase, hid),
    prefetchedMonth ? fetchMonthExpenses(supabase, hid, y, m) : Promise.resolve(null),
  ]);
  if (!household) redirect("/onboarding");

  const data: InitialData = {
    me: userId,
    household,
    members,
    categories,
    trackers,
    initialMonth: requested ?? null,
    prefetchedMonth,
    initialExpenses,
  };
  return <TrackerApp initial={data} />;
}
