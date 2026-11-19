import { beforeEach, describe, expect, it, vi } from "vitest";
import { breathworkRow, secondYogaRow, yogaRow } from "@/tests/fixtures/practice-rows";

// The Supabase client is fully mocked: these tests never create a real client or touch the network.
type QueryResponse = { data: unknown; error: unknown };

const state = vi.hoisted(() => ({
  configured: true,
  response: { data: null, error: null } as { data: unknown; error: unknown },
  throwError: null as Error | null,
  calls: [] as { method: string; args: unknown[] }[],
}));

vi.mock("@/lib/supabase/client", () => {
  function makeBuilder() {
    const record = (method: string, args: unknown[]) => state.calls.push({ method, args });
    const settle = (): Promise<QueryResponse> =>
      state.throwError ? Promise.reject(state.throwError) : Promise.resolve(state.response);
    const builder = {
      select: (...args: unknown[]) => (record("select", args), builder),
      eq: (...args: unknown[]) => (record("eq", args), builder),
      order: (...args: unknown[]) => (record("order", args), settle()),
      maybeSingle: (...args: unknown[]) => (record("maybeSingle", args), settle()),
    };
    return builder;
  }
  return {
    getSupabaseClient: () =>
      state.configured
        ? {
            ok: true,
            client: {
              from: (table: string) => (
                state.calls.push({ method: "from", args: [table] }),
                makeBuilder()
              ),
            },
          }
        : {
            ok: false,
            reason: "not-configured",
            missing: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
          },
  };
});

const { listPractices, getPracticeBySlug } = await import("@/lib/content");

beforeEach(() => {
  state.configured = true;
  state.response = { data: null, error: null };
  state.throwError = null;
  state.calls = [];
});

describe("listPractices", () => {
  it("returns typed practices of the requested type from Supabase", async () => {
    state.response = { data: [secondYogaRow, yogaRow], error: null };

    const result = await listPractices("Yoga");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map((practice) => practice.slug)).toEqual([
      "another-test-pose",
      "test-yoga-pose",
    ]);
    expect(result.data[1]).toEqual({
      slug: "test-yoga-pose",
      title: "Test Yoga Pose",
      type: "Yoga",
      difficulty: "Beginner",
      bodyFocus: ["Back", "Hips"],
      summary: "A test summary.",
      instructions: ["Step one.", "Step two."],
      benefits: "Test benefits.",
      caution: "Stop if you feel pain.",
      image: { path: "/images/practices/test-yoga-pose.svg", alt: "Test image" },
      attribution: {
        source: "Test source",
        license: "Test license",
        imageAttribution: "Test image attribution",
        isPlaceholder: true,
      },
    });
    expect(state.calls).toContainEqual({ method: "from", args: ["practices"] });
    expect(state.calls).toContainEqual({ method: "eq", args: ["type", "Yoga"] });
    expect(state.calls).toContainEqual({ method: "order", args: ["title", { ascending: true }] });
  });

  it("allows practices without difficulty or body focus outside Yoga", async () => {
    state.response = { data: [breathworkRow], error: null };

    const result = await listPractices("Breathwork");

    expect(result).toMatchObject({
      ok: true,
      data: [{ slug: "test-breathing", difficulty: null, bodyFocus: [], caution: null }],
    });
  });

  it("returns an empty list when there are no practices", async () => {
    state.response = { data: [], error: null };
    expect(await listPractices("Meditation")).toEqual({ ok: true, data: [] });
  });

  it("returns a typed failure when Supabase returns an error", async () => {
    state.response = { data: null, error: { code: "PGRST000", message: "connection error" } };

    expect(await listPractices("Yoga")).toEqual({
      ok: false,
      reason: "error",
      error: { kind: "query-failed", message: "PGRST000: connection error" },
    });
  });

  it("returns a typed failure when the request throws", async () => {
    state.throwError = new Error("fetch failed");

    expect(await listPractices("Yoga")).toEqual({
      ok: false,
      reason: "error",
      error: { kind: "query-failed", message: "fetch failed" },
    });
  });

  it("returns a typed failure when Supabase is not configured", async () => {
    state.configured = false;

    const result = await listPractices("Yoga");

    expect(result).toEqual({
      ok: false,
      reason: "error",
      error: {
        kind: "not-configured",
        message: "Missing: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY",
      },
    });
    expect(state.calls).toEqual([]);
  });

  it("rejects rows outside the approved vocabularies", async () => {
    state.response = { data: [{ ...yogaRow, difficulty: "Expert" }], error: null };
    expect(await listPractices("Yoga")).toMatchObject({
      ok: false,
      reason: "error",
      error: { kind: "invalid-data" },
    });

    state.response = { data: [{ ...yogaRow, body_focus: ["Neck"] }], error: null };
    expect(await listPractices("Yoga")).toMatchObject({
      ok: false,
      error: { kind: "invalid-data" },
    });
  });

  it("rejects Yoga rows without difficulty or body focus", async () => {
    state.response = { data: [{ ...yogaRow, body_focus: [] }], error: null };
    expect(await listPractices("Yoga")).toMatchObject({
      ok: false,
      error: { kind: "invalid-data" },
    });

    state.response = { data: [{ ...yogaRow, difficulty: null }], error: null };
    expect(await listPractices("Yoga")).toMatchObject({
      ok: false,
      error: { kind: "invalid-data" },
    });
  });

  it("rejects a row whose type does not match the request", async () => {
    state.response = { data: [breathworkRow], error: null };
    expect(await listPractices("Yoga")).toMatchObject({
      ok: false,
      error: { kind: "invalid-data" },
    });
  });

  it("rejects an unknown practice type without querying", async () => {
    // @ts-expect-error: deliberately passing a value outside PracticeType
    const result = await listPractices("Pilates");
    expect(result).toMatchObject({ ok: false, error: { kind: "invalid-data" } });
    expect(state.calls).toEqual([]);
  });
});

describe("getPracticeBySlug", () => {
  it("returns the practice for a known slug", async () => {
    state.response = { data: yogaRow, error: null };

    const result = await getPracticeBySlug("test-yoga-pose");

    expect(result).toMatchObject({ ok: true, data: { slug: "test-yoga-pose", type: "Yoga" } });
    expect(state.calls).toContainEqual({ method: "eq", args: ["slug", "test-yoga-pose"] });
    expect(state.calls).toContainEqual({ method: "maybeSingle", args: [] });
  });

  it("returns not-found for an unknown slug", async () => {
    state.response = { data: null, error: null };
    expect(await getPracticeBySlug("no-such-practice")).toEqual({ ok: false, reason: "not-found" });
  });

  it("returns not-found for an empty slug without querying", async () => {
    expect(await getPracticeBySlug("  ")).toEqual({ ok: false, reason: "not-found" });
    expect(state.calls).toEqual([]);
  });

  it("returns a typed failure when Supabase returns an error", async () => {
    state.response = { data: null, error: { message: "permission denied" } };
    expect(await getPracticeBySlug("test-yoga-pose")).toEqual({
      ok: false,
      reason: "error",
      error: { kind: "query-failed", message: "permission denied" },
    });
  });

  it("returns a typed failure when the request throws", async () => {
    state.throwError = new Error("network down");
    expect(await getPracticeBySlug("test-yoga-pose")).toMatchObject({
      ok: false,
      reason: "error",
      error: { kind: "query-failed" },
    });
  });

  it("returns a typed failure when Supabase is not configured", async () => {
    state.configured = false;
    expect(await getPracticeBySlug("test-yoga-pose")).toMatchObject({
      ok: false,
      reason: "error",
      error: { kind: "not-configured" },
    });
  });

  it("returns a typed failure for a malformed row", async () => {
    state.response = { data: { ...yogaRow, instructions: [] }, error: null };
    expect(await getPracticeBySlug("test-yoga-pose")).toMatchObject({
      ok: false,
      error: { kind: "invalid-data" },
    });
  });
});
