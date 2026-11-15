import { describe, expect, it, vi } from "vitest";
import { getSupabaseConfig } from "@/lib/supabase/config";

// Dummy, non-routable values only. Tests never use a real Supabase project.
const TEST_URL = "https://example.supabase.test";
const TEST_ANON_KEY = "test-anon-key";

describe("getSupabaseConfig", () => {
  it("returns the URL and anon key when both variables are set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", TEST_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", TEST_ANON_KEY);

    expect(getSupabaseConfig()).toEqual({ ok: true, url: TEST_URL, anonKey: TEST_ANON_KEY });
  });

  it("reports both names when neither variable is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined);

    expect(getSupabaseConfig()).toEqual({
      ok: false,
      missing: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    });
  });

  it("reports only the missing variable when one is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", TEST_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined);

    expect(getSupabaseConfig()).toEqual({ ok: false, missing: ["NEXT_PUBLIC_SUPABASE_ANON_KEY"] });
  });

  it("treats empty or whitespace-only values as missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "   ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    expect(getSupabaseConfig()).toEqual({
      ok: false,
      missing: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    });
  });
});
