import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Every Supabase email link (signup confirmation, password reset, magic
// link) lands here with a `code` param. Exchanging it for a session is what
// actually logs the browser in — without this route, clicking the email
// link would just open the app logged out.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
