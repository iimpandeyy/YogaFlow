# Supabase Setup (project owner)

> **Who runs this:** the human project owner only. AI agents prepare these files but never apply them
> to any Supabase project (POLICY §6, content governance).
> **Issue:** #8 (YF-03). **Files:** `supabase/migrations/20261120000000_practice_content.sql`, `supabase/seed.sql`.

YogaFlow reads public practice content from one Supabase PostgreSQL table, `public.practices`.
Row-level security (RLS) is on, and the public can only read (SELECT). The app uses only the project
URL and the **publishable key** (public by design; it acts as the anonymous `anon` role). No Supabase Authentication, no Storage, no user data.

This guide sets up the **main content project** that the app reads from. The separate, seeded Supabase
**test project** used by end-to-end tests is configured later, in Issue #21. Do not use this project for
automated tests.

## 1. Create the Supabase project

1. Sign in at <https://supabase.com/dashboard> and choose **New project**.
2. Pick a name (for example `yogaflow`), a region close to your users, and a strong database password.
   Keep the password in your password manager. YogaFlow never needs it.
3. Wait until the project finishes provisioning.

## 2. Run the migration (creates the table and RLS)

1. In the project, open **SQL Editor** → **New query**.
2. Open `supabase/migrations/20261120000000_practice_content.sql` from the repository, copy **all** of it,
   and paste it into the editor.
3. Read it, then click **Run**. It should finish with "Success. No rows returned".

## 3. Run the seed (loads the 12 practices)

1. Open a **new** query in the SQL Editor.
2. Copy all of `supabase/seed.sql` and paste it in. Click **Run**.
3. Optional check in the editor: `select type, count(*) from public.practices group by type;`
   should show Yoga 6, Breathwork 3, Meditation 3.

The seed is safe to run again: it updates existing rows by slug. Every seed practice is AI-written draft
content with `is_placeholder = true`. It must be human-reviewed before the course release.

Do not edit seed content in the editor. Change `supabase/seed/practices.json` in the repository, run
`npm run seed:generate` to rebuild `supabase/seed.sql`, get it reviewed, and run the new `seed.sql`.

## 4. Find the two values

In the Supabase dashboard, open **Project Settings** → **API** (or **Data API** / **API Keys**):

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Project URL** |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **API Keys** → the **Publishable key** (starts with `sb_publishable_`). Do not use the legacy anon key or any secret key. |

These two values are **public by design**: they reach the browser, and RLS keeps the data read-only.
They still must **never be committed** to this public repository or pasted into Issues or PRs.

> **Never use a secret key or the service-role key** (`sb_secret_…`). It bypasses RLS. It must not go into
> `.env.local`, Vercel, the repository, or any browser code.

## 5. Place the values

**Local development:** create a file named `.env.local` in the repository root (next to `package.json`)
and type or paste the two values into it yourself. It is ignored by git. AI agents never read, write,
or print this file or its values. You can copy `.env.example` as a starting point:

```sh
NEXT_PUBLIC_SUPABASE_URL=<your Project URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your publishable key>
```

**Vercel:** open the Vercel project → **Settings** → **Environment Variables**, and add the same two
names with their values for the environments you deploy (Production, and Preview if you use it).
Then redeploy so the new values take effect: Vercel project → **Deployments** → on the latest
deployment, open the **⋯** menu → **Redeploy**.

## 6. Verify

From the repository root, run:

```sh
npm run verify:supabase
```

It loads `.env.local` if present, uses only the publishable key, and never prints the URL, the key, or any
other environment value. Expected output:

```
1. Practice counts (read with the publishable key)
   PASS Yoga: 6 rows
   PASS Breathwork: 3 rows
   PASS Meditation: 3 rows
2. Anonymous write attempts (must be rejected by privileges / RLS)
   PASS insert rejected (42501: permission denied for table practices)
   PASS update rejected (42501: permission denied for table practices)
   PASS delete rejected (42501: permission denied for table practices)

Result: PASS
```

The exact rejection messages may differ. What matters is that every write is rejected with a
**permission** error (code `42501`). The probes use the slug `__verify_probe__` and an invalid type, so a
probe row can never be stored while the migration's constraints exist.

How to read a FAIL:

- **"writes are NOT blocked; only a constraint stopped the row"** (code `23514`): the anon role can
  insert. Only the CHECK constraints stopped the probe. Re-run the migration (it sets up RLS and the
  SELECT-only grants) and verify again.
- **"only a helper-function privilege stopped it"**: the anon role can insert and RLS let the write
  through. Re-run the migration and verify again.
- **"insert was ACCEPTED"**, or **"the write privilege exists"** for update/delete: public writes are
  not blocked. Re-run the migration and verify again.
- **"inconclusive"**: the request failed for another reason (for example, network or a wrong URL).
  Fix that and run the check again.

If a probe row was ever stored, remove it in the SQL Editor:

```sql
delete from public.practices where slug = '__verify_probe__';
```

This check is run by the owner only. It is never run in CI, and automated tests never connect to the
production Supabase project.

## Troubleshooting

- **"Missing environment variable(s)"**: `.env.local` is missing, is not in the repository root, or a
  name is misspelled.
- **Counts are 0**: the seed has not been run, or it ran in a different project.
- **"relation public.practices does not exist"**: run the migration (step 2) before the seed.
