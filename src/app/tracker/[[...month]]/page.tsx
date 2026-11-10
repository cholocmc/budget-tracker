import { redirect } from "next/navigation";
import { TrackerApp } from "@/components/tracker/TrackerApp";
import { fetchCategories, fetchExpenses, fetchHousehold, fetchMembers, fetchTrackers } from "@/lib/data";
import { isMonthKey, parseMonthKey } from "@/lib/format";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { InitialData } from "@/lib/types";

export const metadata = { title: "Tracker · Monthly Budget Tracker" };

export default async function TrackerPage({ params }: { params: Promise<{ month?: string[] }> }) {
  const { month } = await params;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) redirect("/onboarding");

  const requested = month?.[0];
  if (month && (month.length > 1 || !isMonthKey(requested))) redirect("/tracker");

  const hid = membership.household_id as string;
  const [household, members, categories, trackers] = await Promise.all([
    fetchHousehold(supabase, hid),
    fetchMembers(supabase, hid),
    fetchCategories(supabase, hid),
    fetchTrackers(supabase, hid),
  ]);
  if (!household) redirect("/onboarding");

  // The bare /tracker route opens on the viewer's local current month, which only the browser knows.
  let initialExpenses = null;
  if (requested) {
    const { y, m } = parseMonthKey(requested);
    const t = trackers.find((x) => x.year === y && x.month === m);
    initialExpenses = t ? await fetchExpenses(supabase, t.id) : [];
  }

  const data: InitialData = {
    me: user.id,
    household,
    members,
    categories,
    trackers,
    initialMonth: requested ?? null,
    initialExpenses,
  };
  return <TrackerApp initial={data} />;
}
