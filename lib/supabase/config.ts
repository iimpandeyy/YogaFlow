/**
 * Supabase public configuration, read only from environment variables.
 *
 * Only the project URL and the publishable key are used. No service-role key is ever read here.
 * Nothing in this module reads the environment at import time, so `next build` and unit tests
 * succeed when the variables are absent.
 */

export const SUPABASE_ENV_NAMES = {
  url: "NEXT_PUBLIC_SUPABASE_URL",
  publishableKey: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
} as const;

export type SupabaseEnvName = (typeof SUPABASE_ENV_NAMES)[keyof typeof SUPABASE_ENV_NAMES];

export type SupabaseConfigResult =
  { ok: true; url: string; publishableKey: string } | { ok: false; missing: SupabaseEnvName[] };

export function getSupabaseConfig(): SupabaseConfigResult {
  // Direct property access (not dynamic lookup) so Next.js can inline NEXT_PUBLIC_* values.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

  const missing: SupabaseEnvName[] = [];
  if (!url) missing.push(SUPABASE_ENV_NAMES.url);
  if (!publishableKey) missing.push(SUPABASE_ENV_NAMES.publishableKey);

  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, url, publishableKey };
}
