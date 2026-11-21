/**
 * Owner-run check of a Supabase project after the migration and seed are applied (Issue #8).
 *
 *   npm run verify:supabase
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY from the environment
 * (`.env.local` is loaded automatically when present). Uses ONLY the publishable key.
 * It never prints the URL, the key, or any other environment value. It is not run in CI.
 *
 * Checks:
 *   1. Per-type practice counts match the seed (6 Yoga, 3 Breathwork, 3 Meditation).
 *   2. Anonymous INSERT, UPDATE, and DELETE are rejected (RLS / SELECT-only grants).
 */
import { createClient } from "@supabase/supabase-js";

const EXPECTED_COUNTS = { Yoga: 6, Breathwork: 3, Meditation: 3 };
const PROBE_SLUG = "__verify_probe__";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

/** Removes any configuration value from text before it is printed. */
function redact(text) {
  let result = String(text ?? "");
  for (const secret of [url, publishableKey]) {
    if (secret) result = result.split(secret).join("[redacted]");
  }
  return result;
}

function describeError(error) {
  if (!error) return "unknown error";
  const code = typeof error.code === "string" && error.code ? `${error.code}: ` : "";
  return redact(`${code}${error.message ?? error}`);
}

/**
 * 42501 = insufficient_privilege: no write grant on the table, or blocked by row-level security.
 * A "permission denied for function …" error is NOT proof: it comes from the CHECK-constraint
 * helper functions (EXECUTE revoked from anon), which only run after the table grant and RLS
 * already allowed the write. Treat it as a failure.
 */
function isPrivilegeDenied(error) {
  if (!error) return false;
  const message = String(error.message ?? "");
  if (/permission denied for function/i.test(message)) return false;
  return error.code === "42501" || /permission denied|row-level security/i.test(message);
}

function printCleanup() {
  console.log(
    "   Remove the probe row in the SQL Editor, then re-run the migration and re-check RLS:",
  );
  console.log(`   delete from public.practices where slug = '${PROBE_SLUG}';`);
}

async function main() {
  const missing = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!publishableKey) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (missing.length > 0) {
    console.error(`Missing environment variable(s): ${missing.join(", ")}`);
    console.error("Set them in .env.local at the repository root (see docs/SUPABASE_SETUP.md).");
    return 1;
  }
  if (publishableKey.startsWith("sb_secret_")) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY holds a SECRET key (sb_secret_...). Replace it with the",
    );
    console.error("publishable key (sb_publishable_...) and rotate the secret key in Supabase.");
    return 1;
  }

  const supabase = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  let failed = false;

  console.log("1. Practice counts (read with the publishable key)");
  for (const [type, expected] of Object.entries(EXPECTED_COUNTS)) {
    const { count, error } = await supabase
      .from("practices")
      .select("slug", { count: "exact", head: true })
      .eq("type", type);
    if (error) {
      console.log(`   FAIL ${type}: could not read (${describeError(error)})`);
      failed = true;
    } else if (count !== expected) {
      console.log(`   FAIL ${type}: ${count} rows (expected ${expected})`);
      failed = true;
    } else {
      console.log(`   PASS ${type}: ${count} rows`);
    }
  }

  console.log("2. Anonymous write attempts (must be rejected by privileges / RLS)");

  // INSERT: the probe row deliberately violates the slug-format and type CHECK constraints, so it
  // can never persist while the migration's constraints exist, even if write privileges leaked.
  const { error: insertError } = await supabase.from("practices").insert({
    slug: PROBE_SLUG,
    title: "Verification probe",
    type: "VerifyProbe",
    summary: "Verification probe",
    instructions: ["Verification probe"],
    benefits: "Verification probe",
    image_path: "/images/practices/verify-probe.svg",
    image_alt: "Verification probe",
    is_placeholder: true,
  });
  if (isPrivilegeDenied(insertError)) {
    console.log(`   PASS insert rejected (${describeError(insertError)})`);
  } else if (/permission denied for function/i.test(String(insertError?.message ?? ""))) {
    console.log(
      `   FAIL insert: writes are NOT blocked; the table grant and RLS both allowed the write and only a helper-function privilege stopped it (${describeError(insertError)})`,
    );
    failed = true;
  } else if (insertError?.code === "23514") {
    console.log(
      `   FAIL insert: writes are NOT blocked; only a constraint stopped the row (${describeError(insertError)})`,
    );
    failed = true;
  } else if (insertError) {
    console.log(
      `   FAIL insert inconclusive: the request failed for another reason (${describeError(insertError)})`,
    );
    failed = true;
  } else {
    console.log("   FAIL insert was ACCEPTED. Public writes are not blocked.");
    printCleanup();
    failed = true;
  }

  // UPDATE and DELETE: target only the probe slug, which never exists in real content.
  const probes = [
    [
      "update",
      () =>
        supabase
          .from("practices")
          .update({ title: "Verification probe" })
          .eq("slug", PROBE_SLUG)
          .select("slug"),
    ],
    ["delete", () => supabase.from("practices").delete().eq("slug", PROBE_SLUG).select("slug")],
  ];
  for (const [label, run] of probes) {
    const { error } = await run();
    if (isPrivilegeDenied(error)) {
      console.log(`   PASS ${label} rejected (${describeError(error)})`);
    } else if (error) {
      console.log(
        `   FAIL ${label} inconclusive: the request failed for another reason (${describeError(error)})`,
      );
      failed = true;
    } else {
      // Success, even with zero rows affected, means the anon role holds the privilege.
      console.log(`   FAIL ${label}: the write privilege exists (request was not rejected)`);
      failed = true;
    }
  }

  console.log(failed ? "\nResult: FAIL" : "\nResult: PASS");
  return failed ? 1 : 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(`Unexpected error: ${redact(error?.message ?? error)}`);
    process.exitCode = 1;
  });
