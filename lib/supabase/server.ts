import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Reads/writes the session via Next's cookie jar. Server Components can't
 * actually write cookies (Next throws if you try outside a Server Action /
 * Route Handler) — that's fine here because `middleware.ts` already keeps the
 * session fresh on every request, so writes from here are best-effort.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — middleware already
            // handles the refresh, so a failed write here is harmless.
          }
        },
      },
    }
  );
}
