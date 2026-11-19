// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mapPracticeRow } from "@/lib/content/mapping";
import {
  BODY_FOCUS_VALUES,
  DIFFICULTY_LEVELS,
  PRACTICE_TYPES,
  type PracticeRow,
} from "@/lib/content/types";
import { buildSeedSql, readSeedRows, SEED_SQL_PATH } from "@/scripts/generate-seed";

/**
 * Validates the seed content (Issue #8) from its single source, supabase/seed/practices.json, and
 * checks that supabase/seed.sql and the migration stay consistent with it. Reads local files only.
 */

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const rows: PracticeRow[] = readSeedRows();

const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");
const migrationFiles = readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith(".sql"));
const migrationSql = migrationFiles
  .map((name) => readFileSync(join(MIGRATIONS_DIR, name), "utf8"))
  .join("\n");

// Medical-claim wording that must never appear in seed content (RC-01; POLICY §2).
const BANNED_WORDING = [
  /\bdiagnos\w*/i,
  /\btreat(s|ed|ing|ment|ments)?\b/i,
  /\bcur(e|es|ed|ing|ative)\b/i,
  /\bprevent\w*/i,
  /\bheal(s|ed|ing)?\b/i,
  /\btherap\w*/i,
  /\bremed(y|ies|ial)\b/i,
  /\bmedic(al|ine|ation)\w*/i,
  /\bdisease\w*/i,
  /\bdisorder\w*/i,
  /\banxiety\b/i,
  /\bdepression\b/i,
  /\binsomnia\b/i,
  /\bblood pressure\b/i,
  /\brehab\w*/i,
];

function allText(row: PracticeRow): string[] {
  return [
    row.title,
    row.summary,
    row.benefits,
    row.caution ?? "",
    row.image_alt,
    ...row.instructions,
  ];
}

describe("seed content", () => {
  it("contains exactly 6 Yoga, 3 Breathwork, and 3 Meditation practices", () => {
    const counts = Object.fromEntries(
      PRACTICE_TYPES.map((type) => [type, rows.filter((row) => row.type === type).length]),
    );
    expect(counts).toEqual({ Yoga: 6, Breathwork: 3, Meditation: 3 });
    expect(rows).toHaveLength(12);
  });

  it("uses unique, URL-safe slugs", () => {
    const slugs = rows.map((row) => row.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it.each(rows.map((row) => [row.slug, row] as const))(
    "%s satisfies the content contract",
    (_slug, row) => {
      // The same runtime validation the data-access layer applies to Supabase rows.
      expect(mapPracticeRow(row)).not.toBeNull();

      expect(PRACTICE_TYPES).toContain(row.type);
      if (row.difficulty !== null) expect(DIFFICULTY_LEVELS).toContain(row.difficulty);
      for (const focus of row.body_focus) expect(BODY_FOCUS_VALUES).toContain(focus);
      expect(new Set(row.body_focus).size).toBe(row.body_focus.length);

      if (row.type === "Yoga") {
        expect(row.difficulty).not.toBeNull();
        expect(row.body_focus.length).toBeGreaterThan(0);
      }

      expect(row.title.trim()).not.toBe("");
      expect(row.summary.trim()).not.toBe("");
      expect(row.benefits.trim()).not.toBe("");
      expect(row.instructions.length).toBeGreaterThanOrEqual(3);
      for (const step of row.instructions) expect(step.trim()).not.toBe("");
      expect(row.image_alt.trim()).not.toBe("");

      // Every seed practice is relevant to beginners, so each carries caution text that tells
      // users to stop (POLICY §3).
      expect(row.caution).toBeTruthy();
      expect(row.caution).toMatch(/\bstop\b/i);

      // AI-written, unreviewed draft content: placeholder until a human reviews it.
      expect(row.is_placeholder).toBe(true);
      expect(row.source).toBeTruthy();
      expect(row.license).toBeTruthy();
      expect(row.image_attribution).toBeTruthy();
    },
  );

  it("references an existing static image in the repository for every practice", () => {
    for (const row of rows) {
      expect(row.image_path).toMatch(/^\/images\/practices\/[a-z0-9-]+\.svg$/);
      expect(existsSync(join(ROOT, "public", row.image_path)), row.image_path).toBe(true);
    }
  });

  it("uses no diagnose/treat/cure/prevent or other medical-claim wording", () => {
    const hits: string[] = [];
    for (const row of rows) {
      for (const text of allText(row)) {
        for (const pattern of BANNED_WORDING) {
          if (pattern.test(text)) hits.push(`${row.slug}: ${pattern} in "${text}"`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});

describe("seed.sql", () => {
  it("is up to date with supabase/seed/practices.json (run `npm run seed:generate`)", () => {
    const committed = readFileSync(SEED_SQL_PATH, "utf8").replaceAll("\r\n", "\n");
    expect(committed).toBe(buildSeedSql(rows));
  });

  it("inserts into public.practices only and contains no destructive or privilege statements", () => {
    const sql = readFileSync(SEED_SQL_PATH, "utf8").toLowerCase();
    expect(sql).toContain("insert into public.practices");
    expect(sql).not.toMatch(/\b(drop|truncate|delete|grant|revoke|alter)\b/);
  });
});

describe("migration", () => {
  it("exists as a versioned SQL file", () => {
    expect(migrationFiles.some((name) => /^\d{14}_practice_content\.sql$/.test(name))).toBe(true);
  });

  it("enforces the same vocabularies as the TypeScript types", () => {
    const quoted = (values: readonly string[]) => values.map((value) => `'${value}'`).join(", ");
    expect(migrationSql).toContain(`type in (${quoted(PRACTICE_TYPES)})`);
    expect(migrationSql).toContain(`difficulty in (${quoted(DIFFICULTY_LEVELS)})`);
    expect(migrationSql).toContain(`body_focus <@ array[${quoted(BODY_FOCUS_VALUES)}]::text[]`);
  });

  it("enables RLS with a SELECT-only public policy and no write policies or grants", () => {
    const sql = migrationSql.toLowerCase();
    expect(sql).toContain("alter table public.practices enable row level security");
    expect(sql).toMatch(
      /create policy[^;]*on public\.practices\s+for select\s+to anon, authenticated/,
    );
    expect(sql).not.toMatch(/for\s+(insert|update|delete|all)\b/);
    expect(sql).toContain("revoke all on table public.practices from anon, authenticated");
    expect(sql).toMatch(/grant select on table public\.practices to anon, authenticated;/);
    expect(sql).not.toMatch(/grant\s+(insert|update|delete|all|truncate)/);
  });

  it("uses no Supabase Storage or Authentication objects", () => {
    expect(migrationSql.toLowerCase()).not.toMatch(/\b(storage|auth)\.[a-z_]+/);
  });
});

describe("application runtime", () => {
  it("never imports the local seed data, test fixtures, or scripts", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      if (!existsSync(dir)) return;
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) {
          const source = readFileSync(path, "utf8");
          if (/practices\.json|supabase\/seed|tests\/fixtures|scripts\//.test(source)) {
            offenders.push(relative(ROOT, path));
          }
        }
      }
    };
    for (const dir of ["app", "components", "lib"]) walk(join(ROOT, dir));
    expect(offenders).toEqual([]);
  });

  it("references no service-role key", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      if (!existsSync(dir)) return;
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/SERVICE_ROLE|service_role/.test(readFileSync(path, "utf8"))) {
          offenders.push(relative(ROOT, path));
        }
      }
    };
    for (const dir of ["app", "components", "lib", "scripts", "supabase"]) walk(join(ROOT, dir));
    expect(offenders).toEqual([]);
  });
});
