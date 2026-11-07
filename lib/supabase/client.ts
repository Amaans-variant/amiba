import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for anything running in the browser (Client Components,
 * event handlers, the Zustand stores). Safe to call repeatedly — it's cheap.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
