import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

// Refreshes the Supabase session cookie and enforces the routing rules in PRD §2.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims verifies the JWT locally against the cached JWKS (with asymmetric signing keys), so most
  // requests skip the Auth server round trip that getUser makes. It still refreshes expired sessions.
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;

  const path = request.nextUrl.pathname;
  const isTracker = path === "/tracker" || path.startsWith("/tracker/");
  const isOnboarding = path === "/onboarding";
  const isLanding = path === "/";

  const redirectTo = (target: string) => {
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = "";
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!userId) {
    return isTracker || isOnboarding ? redirectTo("/") : response;
  }

  // The tracker page looks up the membership itself and redirects to /onboarding without one,
  // so the proxy skips that duplicate query to keep it off the tracker's critical path.
  if (isOnboarding || isLanding) {
    const { data } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", userId)
      .maybeSingle();
    const hasHousehold = !!data;
    if (isLanding) return redirectTo(hasHousehold ? "/tracker" : "/onboarding");
    if (isOnboarding && hasHousehold) return redirectTo("/tracker");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|opengraph-image|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
