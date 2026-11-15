# YogaFlow — Project Instructions for Claude Code

YogaFlow is a responsive Next.js/TypeScript/Tailwind web app (Vercel) that helps beginners discover
yoga, breathwork, and meditation practices. Content comes from Supabase PostgreSQL (read-only, RLS),
and Favorites/Routine live in browser `localStorage`. It is a **general-wellness** product, **not**
a medical one. CSCI 5520 course project. The repository is **public**.

## 1. Authoritative context (read; do not duplicate)

| Source | Governs |
|---|---|
| `docs/planning/Lab_HW1_YogaFlow_SDD_Final.docx` (SDD v1.0) | Requirements, scope, and terminology. **Wins every conflict** (DD-06). |
| `docs/planning/Lab3_YogaFlow_Plan.docx` (Plan v1.5) | Implementation intent, owner decisions (§1.4), and phase order. |
| `docs/ARCHITECTURE.md` | Components, platform and trust boundaries, and Must/Never rules. |
| `docs/POLICY.md` | Roles, wellness/safety language, privacy, terminology, content governance, and accessibility. |
| `docs/ROADMAP.md` | Phases and dependencies, at a high level. |
| `docs/DEVELOPMENT.md` | Commands, branch workflow, the evidence each PR needs, and the Definition of Done. |
| GitHub Issues #6–#24 | **The detailed task definitions.** Each Issue's acceptance criteria are the contract. |
| [GitHub Project](https://github.com/users/iimpandeyy/projects/1) | Status, sequence, and the **Human Review** field. |
| [Figma Make prototype](https://www.figma.com/make/4hOesY7SCk5K9yLGvl4c1Q/YogaFlow-interactive-prototype?t=u23BoWOnMakzJlcW-1) | Design reference only. Never invent unverified frame details; the SDD wins. |

Precedence: **SDD > Plan > ARCHITECTURE/POLICY > Issue text > Figma > anything else.**
On task details, the GitHub Project/Issues override ROADMAP.

## 2. Where work comes from

- Implement **only** GitHub Issues whose Project field says **Human Review = Reviewed**, and only
  once their listed dependencies are done. Work from the Issue's acceptance criteria, not from guesses.
- One Issue per branch/PR. Do not bundle in unrelated changes, refactors, or "while I'm here" features.
- If an Issue is ambiguous, incomplete, or conflicts with a higher source, **ask**. Do not fill
  the gap yourself.
- Never change Human Review, close Issues as done, or alter Project fields unless the human asks.

## 3. Branch and promotion model

Promotion flow: `aidev/*` → PR → `dev` → (human) `staging` → (human) `main` → Vercel production.

| Branch | Role | Who controls it |
|---|---|---|
| `aidev/<issue#>-<slug>` | Feature work for one Issue | **The agent, autonomously**: commits, pushes, opens a PR into `dev`. |
| `dev` | Development integration | The agent **may merge its own PR** once the merge gate below is met. Direct pushes are not allowed; use a PR. |
| `staging` | Higher-trust pre-production/integration, before `main` | **Human only.** |
| `main` | Production; deploys to Vercel | **Human only.** |

**Merge gate for `dev`.** The agent merges its own PR only when **all** of these hold, and the evidence
is recorded in the PR:
1. Every required check in `docs/DEVELOPMENT.md` §2 passes, and CI (once it exists) is green on the PR.
2. `qa-reviewer` returned `PASS`. `PASS WITH GAPS` or `FAIL` does not qualify.
3. No `HUMAN DECISION REQUIRED` or unresolved architecture/security/policy/UX escalation remains.
4. The PR targets `dev` and contains only the Issue's scope.

If any condition is unmet or uncertain, leave the PR open and report to the human.

- The agent never pushes to, opens a PR into, or merges into `staging`/`main`, and never deploys production.
- Never bypass branch protection or rulesets: no `--force` to shared branches, no `--no-verify`, and no `--admin` merges.
- Never deploy to production, promote a release, or apply anything to production Supabase.
- A PreToolUse hook (`.claude/hooks/guard.mjs`) enforces these rules mechanically. Treat a hook
  block as a hard stop. Do not look for a way around it.

## 4. Agent team (the main session is the Lead/Coordinator)

The main session plans the work, talks to the human, and decides when a specialist adds value.
Specialists live in `.claude/agents/`. They report back to the Lead and never talk to the human directly.

| Agent | When to use it |
|---|---|
| `implementation-engineer` | Making the code changes for a reviewed Issue (or the Lead does small ones directly). |
| `qa-reviewer` | **Always**, before the Lead claims an Issue is done. It verifies independently. |
| `architecture-security-reviewer` | **Only** when work touches architecture, Supabase/data access, env/secrets, auth/permissions, dependencies, CI, or privacy/security boundaries. |
| `ux-policy-reviewer` | **Only** when work touches user-visible UI, copy, wellness/safety wording, accessibility, terminology, or Figma-aligned behavior. |

Do not spawn agents just for ceremony. A docs-only or config-only change may need nothing beyond the Lead and QA.
The standard workflow is the `yogaflow-issue` skill (`.claude/skills/yogaflow-issue/`).

## 5. Decision rights

**Proceed independently** when all of these hold:
- The Issue is Reviewed, its dependencies are met, and the change sits inside its acceptance criteria.
- The decision is a local implementation detail: naming, file layout inside the established folders,
  test structure, or small refactors inside the files the Issue touches.
- The work stays inside the feature-branch/dev boundary and needs no new secret, service, or account.

**Ask the human first** when any of these come up:
- A new runtime dependency or service, a CI/workflow change beyond what the Issue specifies, or
  a schema/RLS/migration choice the Issue leaves open.
- Anything listed under ARCHITECTURE §10 "open items" (for example, the rendering/caching strategy).
- User-visible wording about safety, caution, wellness, or the disclaimer; any terminology change;
  any UI detail that cannot be verified against the SDD or Figma.
- An Issue conflicts with the SDD/POLICY/ARCHITECTURE, or its acceptance criteria cannot be met as written.
- Merging a `dev` PR when any merge-gate condition (§3) is unmet. Any action outside the repo
  (GitHub settings or rulesets, Supabase, Vercel).
- Closing an Issue, or changing Project fields such as Human Review or Status.
- Content changes (seed/migration/data). You may **propose** them as files. Only the owner approves
  and applies them.

**Stop, and report to the human, when any of these happen:**
- A secret or credential is found, needed, or about to be written anywhere in the repo or browser code.
- Work would touch `staging`, `main`, production Supabase, production deploys, or branch protection.
- The change would add out-of-scope features: auth/accounts, user data on a server, Supabase Storage,
  analytics/tracking, Routine reordering, search beyond Yoga, or any SDD §2.3 non-goal.
- Text would make medical diagnosis, treatment, cure, or prevention claims.
- Checks fail and the fix is outside the Issue's scope, or the same check has failed after two serious attempts.
- A hook or permission rule blocks an action.

## 6. Non-negotiable product rules (details in POLICY/ARCHITECTURE)

- **Wellness boundary:** only general wellness information. No diagnose/treat/cure/prevent claims,
  no condition-based filters or personalized medical advice. Disclaimer wording follows the SDD.
- **Safety:** neutral, beginner-friendly caution. Safety & Caution comes **before** the instructions.
  It tells users to stop if they feel pain, and it never relies on color alone.
- **Privacy:** no personal or health data. Favorites/Routine are stored as practice IDs in
  `localStorage` only. No accounts, no Supabase Auth, no tracking.
- **Architecture:** screens read content only through the data-access layer. RLS is on, with SELECT-only
  public access. Only the anon key may reach the browser. Static images are repository assets.
- **Terminology:** the exact labels Yoga, Breathwork, Meditation, Favorites, and Routine; the difficulty
  levels Beginner/Intermediate/Advanced; the body focus values Full Body/Back/Hips/Legs/Shoulders/Core.
- **Content:** AI-written or unlicensed text and images stay `is_placeholder` until a human reviews
  them. Never scrape. AI never publishes content to production.
- **Accessibility:** WCAG 2.2 AA on core screens. Every state has loading, empty, and failure handling.
  No blank screens. No horizontal overflow at mobile width.
- **Scope:** no features beyond the SDD MVP without a documented human decision (RC-12).

## 7. Secrets

- Never write, print, commit, or paste into PRs/Issues any `.env*` contents, Supabase service-role
  key, API key, access token, password, or private credential. `.env.example` holds **names only**.
- Do not read `.env*` files other than `.env.example`. If a value is needed, ask the human to set it.
- Tests never use production Supabase. E2E tests use the separate seeded test project, and its
  credentials live only in GitHub Actions secrets or local env.

## 8. Evidence before confidence

- Never say "done", "fixed", or "passing" without running the checks in `docs/DEVELOPMENT.md` and
  showing the actual results. A check that does not exist yet is reported as **N/A (reason)**, never as a pass.
- Every PR body must include acceptance-criteria → evidence mapping, the commands run with their outcomes,
  the reviewers used, and any open questions or limitations.
- The Lead treats an implementer's claims as unverified until `qa-reviewer` confirms them.

## 9. Environment notes

- Windows 11. Git Bash and PowerShell are both available. Node 24 and npm are installed.
- GitHub CLI: `C:\Users\AiDev\Tools\gh\bin\gh.exe` (not on PATH; call it by full path, and do not reinstall it).
  It is authenticated, with `repo` and `project` scopes. Python is **not installed**.
- Server-side rules (rulesets): `dev` requires a PR (0 approvals) and blocks force-push and deletion.
  `staging`/`main` require a PR with 1 approval. There are no required status checks yet, so the
  merge gate in §3 is enforced by the agent, not by GitHub.
