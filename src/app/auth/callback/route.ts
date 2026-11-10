import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// OAuth redirect target: exchanges the code for a session, then routes by membership (PRD §8).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const { data: membership } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      return NextResponse.redirect(`${origin}${membership ? "/tracker" : "/onboarding"}`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
