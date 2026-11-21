import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig, type SupabaseEnvName } from "./config";

/**
 * Lazily created, read-only-intended Supabase client using the publishable key.
 *
 * The client is created only when this function is called and the configuration is present.
 * Supabase Authentication is not used: sessions are not persisted or refreshed.
 * Content queries belong to the data-access layer (YF-03); screens never call Supabase directly.
 */

export type SupabaseClientResult =
  | { ok: true; client: SupabaseClient }
  | { ok: false; reason: "not-configured"; missing: SupabaseEnvName[] };

let cachedClient: SupabaseClient | undefined;

export function getSupabaseClient(): SupabaseClientResult {
  const config = getSupabaseConfig();
  if (!config.ok) return { ok: false, reason: "not-configured", missing: config.missing };

  cachedClient ??= createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return { ok: true, client: cachedClient };
}
