/**
 * Generates `supabase/seed.sql` from `supabase/seed/practices.json` (Issue #8).
 *
 * Run with `npm run seed:generate`. The JSON file is the single editable source of the seed
 * content; a unit test fails if `seed.sql` is out of date. This script only writes a local file.
 * It never connects to Supabase. Only the project owner applies `seed.sql` (docs/SUPABASE_SETUP.md).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { PracticeRow } from "../lib/content/types";

export const SEED_JSON_PATH = fileURLToPath(
  new URL("../supabase/seed/practices.json", import.meta.url),
);
export const SEED_SQL_PATH = fileURLToPath(new URL("../supabase/seed.sql", import.meta.url));

const COLUMNS: (keyof PracticeRow)[] = [
  "slug",
  "title",
  "type",
  "difficulty",
  "body_focus",
  "summary",
  "instructions",
  "benefits",
  "caution",
  "image_path",
  "image_alt",
  "source",
  "license",
  "image_attribution",
  "is_placeholder",
];

function sqlText(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return sqlText(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "'{}'::text[]";
    return `array[\n      ${value.map((item) => sqlText(String(item))).join(",\n      ")}\n    ]::text[]`;
  }
  throw new Error(`Unsupported seed value: ${JSON.stringify(value)}`);
}

export function readSeedRows(path: string = SEED_JSON_PATH): PracticeRow[] {
  return JSON.parse(readFileSync(path, "utf8")) as PracticeRow[];
}

export function buildSeedSql(rows: PracticeRow[]): string {
  const values = rows
    .map((row) => `  (\n    ${COLUMNS.map((column) => sqlValue(row[column])).join(",\n    ")}\n  )`)
    .join(",\n");
  const updates = COLUMNS.filter((column) => column !== "slug")
    .map((column) => `  ${column} = excluded.${column}`)
    .join(",\n");

  return [
    "-- YogaFlow seed practice content (Issue #8, YF-03; Plan §1.4 D4: 6 Yoga, 3 Breathwork, 3 Meditation).",
    "-- GENERATED from supabase/seed/practices.json by `npm run seed:generate`. Do not edit by hand.",
    "--",
    "-- Applied ONLY by the project owner, after review, in the Supabase SQL Editor, after the",
    "-- migration in supabase/migrations/. See docs/SUPABASE_SETUP.md. Safe to re-run (upsert by slug).",
    "-- All text is AI-written draft content and stays is_placeholder = true until a human reviews it.",
    "",
    "begin;",
    "",
    `insert into public.practices (\n  ${COLUMNS.join(",\n  ")}\n)`,
    "values",
    `${values}`,
    "on conflict (slug) do update set",
    `${updates};`,
    "",
    "commit;",
    "",
  ].join("\n");
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  writeFileSync(SEED_SQL_PATH, buildSeedSql(readSeedRows()), "utf8");
  console.log("Wrote supabase/seed.sql");
}
