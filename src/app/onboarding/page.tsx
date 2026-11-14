import { redirect } from "next/navigation";
import { OnboardingClient } from "@/components/onboarding/OnboardingClient";
import { createSupabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Set up your household · Budget Mate" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { mode } = await searchParams;
  const meta = user.user_metadata ?? {};
  const name: string = meta.full_name || meta.name || user.email || "";
  const avatarUrl: string | null = meta.avatar_url || meta.picture || null;

  return <OnboardingClient userName={name} userAvatarUrl={avatarUrl} initialMode={mode === "join" ? "join" : "create"} />;
}
