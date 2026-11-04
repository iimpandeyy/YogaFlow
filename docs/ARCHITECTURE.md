# YogaFlow Architecture

> **Status:** Final draft for human review (2026-11-05).
> **Sources:** [SDD v1.0 Final Design](planning/Lab_HW1_YogaFlow_SDD_Final.docx), [Implementation Plan v1.4](planning/Lab3_YogaFlow_Plan.docx), GitHub Issues #6–#24 and the [YogaFlow Development Project](https://github.com/users/iimpandeyy/projects/1).
> **Precedence:** The SDD is authoritative (DD-06). If this document conflicts with the SDD, the SDD wins. Changes need a documented human decision.

## 1. Purpose

YogaFlow is a responsive web application. It helps beginners and regular wellness users discover yoga poses, breathing exercises, and meditation practices. Users can understand each practice with its safety context, save favorites, and assemble a simple routine (SDD §1–2). It provides general wellness information only. It is not a medical product (RC-01).

## 2. Architecture at a glance

```
                     HTTPS
 ┌──────────────┐ ───────────▶ ┌─────────────────────────────┐   read-only (anon key, RLS)   ┌──────────────────────────┐
 │   Browser    │              │  Next.js / React app         │ ────────────────────────────▶ │  Supabase PostgreSQL     │
 │ (mobile/     │ ◀─────────── │  (TypeScript, Tailwind CSS)  │                               │  public practice content │
 │  desktop)    │   HTML/JS    │  hosted on Vercel            │                               └──────────────────────────┘
 │              │              │  • routes & UI               │
 │ localStorage │              │  • data-access layer         │      static image assets (from the repository)
 │ Favorites +  │              │  • search / filter logic     │
 │ Routine IDs  │              └─────────────────────────────┘
 └──────────────┘
   Not used in MVP: Supabase Authentication, Supabase Storage, user tables.   Design-time only: Figma Make.
```

The SDD's logical architecture (Figure 1) shows a browser client, a Next.js/React app hosted on Vercel, and Supabase PostgreSQL plus Supabase Authentication. The approved MVP decisions narrow this:
- **OQ-01 (decided):** Favorites and Routine persist in local browser storage. Supabase Authentication is not used.
- **D9:** Supabase PostgreSQL stores public practice content.

## 3. Major components

| Component | Responsibility | Source |
|---|---|---|
| **Browser client** | Renders the UI. Holds Favorites and Routine as practice IDs in `localStorage`. | SDD §5.2; OQ-01; #15 |
| **Next.js / React app (TypeScript, Tailwind CSS)** | Routing, pages, and components: Home, Yoga, Breathwork, Meditation, Practice Details, Favorites, Routine. Search/filter logic. Loading, empty, and failure states. | SDD §5.1, §6.1; Plan §1.4 (D8); #7, #9–#14, #16–#18 |
| **Data-access layer** | The only path from screens to practice content. Typed functions such as get-by-type and get-by-slug. Returns typed "not found" and "failure" results. Server-side reads are preferred. | Plan §3.1; #8 |
| **Supabase PostgreSQL** | Stores curated practice content. Schema and seed are versioned SQL migrations in the repository. Row-level security (RLS) is on, with public read (SELECT) only. | SDD §5.1; Plan §1.4 (D9); #8 |
| **Static image assets** | Practice images live in the repository. Content records store their paths/URLs. | Plan §1.4 (image hosting); #8, #20 |
| **Vercel** | Hosts and deploys the Next.js app. Holds environment configuration. Preview deployments are optional. | SDD §5.1; Plan §1.4 (D7); #23 |
| **CI (GitHub Actions)** | Runs lint, type-check, unit/component tests, and build on pull requests. Runs Playwright end-to-end tests against a separate seeded Supabase test environment, using least-privilege credentials stored only in GitHub Actions secrets. | Plan §1.4; #7, #21 |
| **Supabase test environment** | A separate, seeded Supabase project used only by automated end-to-end tests. It is never the production database. | Plan §1.4 |
| **Figma Make** | Design-time reference only. Not part of the runtime. | SDD §5.2; DD-06 |
| *Supabase Authentication* | **Not used in the MVP.** It needs explicit owner approval and a plan revision. | OQ-01; Plan §1.3 |

## 4. Practice content model

One shared content contract covers all three practice types (DD-04, RISK-03; #8).

- **Identity:** stable `id` / `slug`.
- **Fields:** `title` and `type` (yoga, breathwork, or meditation).
- **Difficulty** (when applicable): **Beginner**, **Intermediate**, or **Advanced**.
- **Body focus** (where available): **Full Body**, **Back**, **Hips**, **Legs**, **Shoulders**, **Core**.
- **Content:** summary, ordered instructions/steps, benefits/purpose, and caution text.
- **Visual:** a static asset path/URL plus alt text.
- **Attribution:** source, license, and an `is_placeholder` flag.

Rules for the model:
- The type system and the database schema both enforce the approved vocabularies.
- No practice may be forced into an inaccurate category.
- Vocabularies change only through a documented human decision (Plan §1.4).
- The MVP seed is **6 Yoga, 3 Breathwork, 3 Meditation** practices (D4).

## 5. Key data and control flows

1. **Discovery (Flow 1):** Home → Yoga Library → search/filter → Practice Details.
   - Library pages request content through the data-access layer, which reads from Supabase.
   - Search covers the practice name/title and keyword fields from the approved content model.
   - Filters cover difficulty and body focus.
   - The page shows a result count, active filter state, reset, and no-results recovery (US-01–US-04; SDD §6.3; #11, #12).
   - Search and filters exist on the **Yoga** library only (SDD §6.1).
2. **Practice Details:**
   - The page resolves a slug through the data-access layer and shows Safety & Caution **before** the step-by-step instructions.
   - The general-wellness disclaimer is visible (US-04, US-10; #13, #14).
   - An unknown slug shows a "not found" state. A Supabase error shows a failure state.
3. **Favorites (Flow 2):**
   - The user saves or removes a practice on its detail page, and the browser storage layer updates.
   - The Favorites page resolves the saved IDs into content through the data-access layer.
   - It has an empty state with a path back to discovery (US-07; #15, #16).
4. **Routine (Flow 3):**
   - The user adds a practice on its detail page. **Duplicates are rejected** (D5).
   - The Routine page shows practices in the order they were added and lets the user remove them.
   - There is no reordering (OQ-03; US-08; #15, #17).
5. **Breathwork / Meditation:** separate library entry points that use the shared detail pattern (DD-04; US-05, US-06; #18).
6. **Build and deploy:**
   - Pull requests run the CI checks.
   - Pushes to `main` deploy to Vercel. Supabase settings come from Vercel environment variables (#7, #23).
7. **Content change** (Plan §1.4, content governance):
   - Changes are prepared as version-controlled seed/migration/data files in the repository (#8). AI agents may propose them.
   - The changes are reviewed, and **only the human project owner approves them** and applies them to production Supabase.
   - AI agents never approve or publish content to production.
   - A placeholder becomes reviewed content only after human review.

## 6. Technology choices

| Technology | Use | Source |
|---|---|---|
| Next.js (App Router) + React | UI, routing, rendering, and the data-access layer | SDD §5.1; #7 |
| TypeScript (strict) | Typed content contract and components | SDD §5.1; #7 |
| Tailwind CSS | Responsive styling | Plan §1.4 (D8); #7 |
| Supabase PostgreSQL | Practice-content store, with RLS read-only | SDD §5.1; D9; #8 |
| Browser `localStorage` | Favorites and Routine (practice IDs only) | OQ-01; #15 |
| Vercel | Hosting and deployment | SDD §5.1; #23 |
| Vitest + React Testing Library | Unit/component tests on local deterministic fixtures/mocks | Plan §1.4; #7 |
| Playwright | End-to-end tests on a separate seeded Supabase test environment | Plan §1.4; #21 |
| GitHub Actions | CI checks on pull requests | #7 |

## 7. Platform boundaries

- **Next.js** owns all user-facing behavior and is the only consumer of Supabase. Screens never query Supabase directly; they call the data-access layer.
- **Supabase** owns:
  - storage of public practice content, with read-only public access enforced by RLS.
  - nothing else in the MVP: no authentication, no user data, no file storage.
- **Vercel** owns hosting and the runtime environment variables: the Supabase URL and public anonymous key. No service-role key is configured for the runtime (#23).
- **The browser** owns Favorites and Routine. They are never sent to Supabase or any server (OQ-01; #15).
- **Static assets** are served with the app from the repository. Supabase Storage is not used.

## 8. Security, privacy, and trust boundaries

| Boundary | Rule |
|---|---|
| Browser ↔ app | The browser is untrusted. It receives public content plus the Supabase **public anonymous key** only. |
| App ↔ Supabase | Public access is read-only, enforced by RLS. Browser-reachable code cannot insert, update, or delete (#8). |
| Secrets | Service-role keys, passwords, and privileged credentials are never committed or exposed to the browser (RC-04). `.env*` files are ignored except `.env.example`, which holds names only (#7). |
| Saved user data | Only practice IDs are stored, in `localStorage`. No names, emails, or health information (RC-03; #15). |
| Test isolation | Unit/component tests use local fixtures and mocks and never connect to Supabase. End-to-end tests use a separate seeded test environment with least-privilege credentials. Those credentials are stored only in secure environment variables or GitHub Actions secrets, never committed. **Automated tests never run against the production/main Supabase database** (Plan §1.4). |
| Production content | Only the project owner approves and applies production content changes. Production credentials and service-role keys never appear in the repository or browser code (Plan §1.4). |
| Repository | The repository is public. Commit no secrets or private information (D6). |

## 9. Architectural rules

**Must**
- Read practice content only through the data-access layer, from Supabase PostgreSQL. Temporary local seed data is allowed only for early scaffolding or tests, and must be out of the runtime path before YF-03 (#8) is complete.
- Enable RLS on content tables, with SELECT-only public access.
- Keep Favorites and Routine in browser storage as practice IDs. Handle unavailable or corrupted storage and stale IDs gracefully (#15).
- Show clear loading, empty, and failure states. Never show a blank screen (RC-09).
- Use the same detail pattern for all practice types, with caution shown before instructions (DD-04; SDD §6.3).
- Support mobile and desktop widths without horizontal page overflow (US-09, RC-07).
- Keep images as static repository assets referenced by path/URL.
- Prepare practice-content changes as repository seed/migration/data files. Have them reviewed and approved by the project owner before they are applied to production.
- Meet WCAG 2.2 AA on core screens and interactions (Plan §1.4; #19).

**Never** (without a documented human decision)
- Add Supabase Authentication, sign-in, user accounts, or user tables (OQ-01).
- Store Favorites, Routine, or any user data in Supabase or on a server.
- Add Supabase Storage.
- Expose a service-role key, or commit any secret.
- Run automated tests against the production/main Supabase database, or give tests more than least-privilege test credentials.
- Let an AI agent apply or publish content changes to production Supabase.
- Let screens query Supabase directly or import raw content data.
- Add native apps, third-party analytics/tracking, or other out-of-scope services (SDD §2.3, RC-12; #23).

## 10. Remaining open items (do not guess)

1. **Rendering and caching strategy.** The choice between static generation, revalidation, or per-request reads of Supabase content is an implementation choice ("where practical", #20). Document it in the implementing PR for human review. It affects build-time dependence on Supabase.
2. **Supabase provisioning (owner actions).** These are recorded owner dependencies, not yet scheduled:
   - the production project and its public configuration, needed for YF-03 (#8);
   - the separate seeded test environment and its least-privilege CI credentials, needed for #21.
