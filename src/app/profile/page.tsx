import { redirect } from "next/navigation";
import { ProfileApp } from "@/components/profile/ProfileApp";
import { fetchBankAccounts, fetchMembers } from "@/lib/data";
import { memberColor } from "@/lib/format";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export const metadata = { title: "Profile · Budget Mate" };

type MembershipRow = { household_id: string; role: Role; households: { name: string } | null };

// PRD §6.7. Open to every signed-in user, with or without a household.
export default async function ProfilePage() {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) redirect("/");

  const [{ data: profile }, { data: membership }, accounts] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", userId).maybeSingle(),
    supabase.from("household_members").select("household_id, role, households(name)").eq("user_id", userId).maybeSingle(),
    fetchBankAccounts(supabase),
  ]);

  const meta = (auth?.claims.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
  const name = (profile?.display_name as string | undefined) || meta.full_name || meta.name || "You";
  const avatarUrl = (profile?.avatar_url as string | null | undefined) || meta.avatar_url || meta.picture || null;
  const hh = membership as unknown as MembershipRow | null;
  const household = hh?.households ? { name: hh.households.name, role: hh.role } : null;

  // The same avatar color the tracker header gives you, which depends on your place in the member list.
  const members = hh ? await fetchMembers(supabase, hh.household_id) : [];
  const avatarColor = memberColor(Math.max(0, members.findIndex((m) => m.user_id === userId)));

  return <ProfileApp name={name} avatarColor={avatarColor} avatarUrl={avatarUrl} household={household} initialAccounts={accounts} />;
}
