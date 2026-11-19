/**
 * Owner-run check of a Supabase project after the migration and seed are applied (Issue #8).
 *
 *   npm run verify:supabase
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from the environment
 * (`.env.local` is loaded automatically when present). Uses ONLY the public anonymous key.
 * It never prints the URL, the key, or any other environment value. It is not run in CI.
 *
 * Checks:
 *   1. Per-type practice counts match the seed (6 Yoga, 3 Breathwork, 3 Meditation).
 *   2. An anonymous INSERT is rejected (RLS / SELECT-only grants).
 */
import { createClient } from "@supabase/supabase-js";

const EXPECTED_COUNTS = { Yoga: 6, Breathwork: 3, Meditation: 3 };
const PROBE_SLUG = "verify-anon-insert-probe";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

/** Removes any configuration value from text before it is printed. */
function redact(text) {
  let result = String(text ?? "");
  for (const secret of [url, anonKey]) {
    if (secret) result = result.split(secret).join("[redacted]");
  }
  return result;
}

function describeError(error) {
  if (!error) return "unknown error";
  const code = typeof error.code === "string" && error.code ? `${error.code}: ` : "";
  return redact(`${code}${error.message ?? error}`);
}

async function main() {
  const missing = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (missing.length > 0) {
    console.error(`Missing environment variable(s): ${missing.join(", ")}`);
    console.error("Set them in .env.local at the repository root (see docs/SUPABASE_SETUP.md).");
    return 1;
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  let failed = false;

  console.log("1. Practice counts (read with the public anonymous key)");
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

  console.log("2. Anonymous write attempt (must be rejected)");
  const { error: insertError } = await supabase.from("practices").insert({
    slug: PROBE_SLUG,
    title: "Verification probe",
    type: "Yoga",
    difficulty: "Beginner",
    body_focus: ["Full Body"],
    summary: "Verification probe",
    instructions: ["Verification probe"],
    benefits: "Verification probe",
    caution: null,
    image_path: "/images/practices/mountain-pose.svg",
    image_alt: "Verification probe",
    is_placeholder: true,
  });
  // 42501 = insufficient_privilege (no INSERT grant, or blocked by row-level security).
  const deniedByDatabase =
    insertError &&
    (insertError.code === "42501" ||
      /permission denied|row-level security/i.test(String(insertError.message ?? "")));
  if (deniedByDatabase) {
    console.log(`   PASS insert rejected (${describeError(insertError)})`);
  } else if (insertError) {
    console.log(
      `   FAIL inconclusive: the request failed for another reason (${describeError(insertError)})`,
    );
    failed = true;
  } else {
    console.log("   FAIL insert was ACCEPTED. Public writes are not blocked.");
    console.log(`   Delete the row with slug '${PROBE_SLUG}' in the SQL Editor and re-check RLS.`);
    failed = true;
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
