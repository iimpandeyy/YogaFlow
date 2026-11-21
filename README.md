# YogaFlow

CSCI 5520 YogaFlow course project

## Setup

Requires Node.js 24 (see `.nvmrc`) and npm.

```sh
npm ci
npm run dev
```

Then open http://localhost:3000.

## Scripts

| Script              | What it does                                                    |
| ------------------- | --------------------------------------------------------------- |
| `npm run dev`       | Start the Next.js development server.                           |
| `npm run build`     | Create a production build.                                      |
| `npm run start`     | Serve the production build (run `build` first).                 |
| `npm run lint`      | Run ESLint, then check formatting with Prettier.                |
| `npm run format`    | Format files with Prettier.                                     |
| `npm run typecheck` | Type-check with TypeScript (`tsc --noEmit`).                    |
| `npm run test`      | Run unit and component tests (Vitest, local fixtures only).     |
| `npm run test:e2e`  | Run Playwright end-to-end tests (starts the dev server itself). |

Owner-only content scripts (see [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)):

- `npm run seed:generate`: rebuild `supabase/seed.sql` from `supabase/seed/practices.json`.
- `npm run verify:supabase`: check a configured Supabase project (row counts, anonymous writes
  rejected). Never run in CI.

Before the first E2E run, install the browser once: `npx playwright install chromium`.
Browsers are not committed.

Optional: set `NEXT_TELEMETRY_DISABLED=1` to turn off Next.js telemetry locally (CI does this).

## Environment variables

| Name                                   | Purpose                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL                                                     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (`sb_publishable_…`; public, read-only via RLS) |

- Locally, copy `.env.example` to `.env.local` and fill in the values. `.env.local` is ignored by git
  and must never be committed.
- For deploys, set them in the Vercel project's environment variables.
- Never use or commit a Supabase service-role key.
- Unit/component tests and the build do not need these variables; tests never connect to Supabase.

## Practice content (Supabase)

Practice content lives in Supabase PostgreSQL (`supabase/migrations/`, `supabase/seed.sql`). The
project owner creates the project, applies the migration and seed, and places the two variables by
following [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md). Screens read content only through the
data-access layer in `lib/content/`.
