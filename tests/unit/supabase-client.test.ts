import { beforeEach, describe, expect, it, vi } from "vitest";

// createClient is mocked: no client is really created and no network request is possible.
const createClientMock = vi.hoisted(() => vi.fn(() => ({ mocked: true })));
vi.mock("@supabase/supabase-js", () => ({ createClient: createClientMock }));

const TEST_URL = "https://example.supabase.test";
const TEST_PUBLISHABLE_KEY = "sb_publishable_test";

describe("getSupabaseClient", () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockClear();
  });

  it("does not create a client when the configuration is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", undefined);
    const { getSupabaseClient } = await import("@/lib/supabase/client");

    expect(getSupabaseClient()).toEqual({
      ok: false,
      reason: "not-configured",
      missing: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
    });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("does not create a client at import time", async () => {
    await import("@/lib/supabase/client");
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("creates one client lazily, with auth persistence and refresh disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", TEST_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", TEST_PUBLISHABLE_KEY);
    const { getSupabaseClient } = await import("@/lib/supabase/client");

    const first = getSupabaseClient();
    const second = getSupabaseClient();

    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledWith(TEST_URL, TEST_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  });
});
