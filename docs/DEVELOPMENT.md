# YogaFlow Development Guide

> **Status:** Draft for human review (2026-11-15). This guide is the single place for commands,
> the branch workflow, and the evidence each change needs.
> Requirements live in the SDD; architecture rules in [ARCHITECTURE.md](ARCHITECTURE.md); product rules in
> [POLICY.md](POLICY.md). This guide does not restate them.

## 1. Toolchain

- Node.js 24 LTS. **The package manager is npm** (the decision is final). Commit `package-lock.json`.
  Do not use other package managers or their lockfiles.
- Next.js (App Router), TypeScript (strict), Tailwind CSS, Vitest + React Testing Library, Playwright.
- GitHub CLI: `C:\Users\AiDev\Tools\gh\bin\gh.exe` (call it by full path).

### GitHub identities

| Who | Account | Used for |
|---|---|---|
| AI agents | **`yyogaaflow`** (git author `YogaFlow AiDev <yyogaaflow@gmail.com>`) | Branches, commits, pushes, PRs, comments, routine `dev` merges |
| Human owner | **`iimpandeyy`** | Independent review and approval of `staging`/`main` promotions, Human Review, closing Issues |

Before any GitHub write, check the active account with
`gh.exe auth status`. If needed, switch with `gh.exe auth switch --user yyogaaflow`.
Run `gh.exe auth setup-git` once so `git push` uses the active gh account rather than credentials cached
in Git Credential Manager. The guard hook refuses pushes and gh writes unless `yyogaaflow` is active, and
refuses commits unless the author email is `yyogaaflow@gmail.com`.

## 2. Commands

YF-02 (#7) creates these scripts with exactly these names. **Until #7 is merged they do not exist.**
Report them as `N/A — scripts not yet created (#7)`. Never report them as passing.

| Purpose | Command | Required for completion? |
|---|---|---|
| Install | `npm ci` (or `npm install` when the lockfile changes) | Yes, whenever dependencies change |
| Local dev server | `npm run dev` | For manual checks of UI work |
| Lint | `npm run lint` | **Yes** |
| Type-check | `npm run typecheck` | **Yes** |
| Unit/component tests | `npm run test` | **Yes** |
| Production build | `npm run build` | **Yes** |
| End-to-end tests | `npm run test:e2e` (#7 scaffolds the script; #21 adds the flow tests) | Yes, for flow-affecting work once the tests exist |
| Guard-hook regression tests | `node .claude/hooks/guard.test.mjs` (add `--live` for identity and live-PR cases) | **Yes**, whenever `.claude/hooks/guard.mjs` or `.claude/settings.json` changes |

Test data rules:
- Unit and component tests use local deterministic fixtures and mocks. They never connect to Supabase.
- E2E tests use the **separate seeded Supabase test project** only, never production.

## 3. Branch and PR workflow

```
aidev/<issue#>-<slug> ──PR──▶ dev ──(human PR + approval)──▶ staging ──(human PR + approval)──▶ main ──▶ Vercel production
   agent works here        agent may merge       higher-trust pre-production          production
                           (merge gate)          human-controlled                     human-controlled
```

1. Start from the latest `origin/dev`: `git switch -c aidev/<issue#>-<short-slug> origin/dev`.
2. Make small, focused commits that reference the Issue (for example, `YF-02: add lint script (#7)`).
3. Push the feature branch and open a PR **into `dev`** (`gh pr create --base dev`). Use "Refs #N".
   Use "Closes #N" only if the human asked for the Issue to be closed.
4. **Merge gate.** Agents (as `yyogaaflow`) may integrate routine work into `dev` **without human
   approval**, but only after the required verification. All of these must hold:
   - lint, typecheck, test and build pass locally, and CI is green on the PR;
   - `qa-reviewer` returned `PASS`;
   - no architecture/security/policy/UX escalation is unresolved;
   - the PR contains only the Issue's scope.

   Post this comment on the PR, then merge with `gh.exe pr merge <n> --merge`:
   ```markdown
   ### Merge gate
   - Checks: lint pass · typecheck pass · test pass · build pass · CI green
   - qa-reviewer: PASS
   - Escalations: none
   - Scope: Issue #N only
   ```
   The guard hook **refuses** a `dev` merge if any CI check is failing or pending, or if the comment is
   missing or doesn't say `qa-reviewer: PASS` and `Escalations: none`. It **asks** the human when the PR
   has no CI checks at all. If any condition is unmet, leave the PR open and report.
5. `staging` is the higher-trust pre-production/integration branch. Promotions from `dev` to `staging`
   and from `staging` to `main` need **1 independent approval from `iimpandeyy`**. There is no bypass, and
   approvals cannot be reduced. Agents may prepare a promotion PR only when the human asks. They never
   approve or merge it, and never deploy production.
6. Never use `--force` on shared branches, `--no-verify`, or `--admin` merges.

## 4. Evidence each PR needs (paste into the PR body)

```markdown
## Issue
Refs #N — <title>. Human Review: Reviewed (confirmed by <who/how>). Dependencies: <met / list>.

## Acceptance criteria → evidence
- [x] <criterion 1> — <file/test/command/screenshot that proves it>
- [ ] <criterion not met> — <why; what is needed>

## Checks run (actual output summarized)
| Check | Command | Result |
|---|---|---|
| Lint | npm run lint | pass / fail / N/A (reason) |
| Type-check | npm run typecheck | … |
| Tests | npm run test | … (n passed) |
| Build | npm run build | … |
| E2E | npm run test:e2e | … |
| Manual | <what was viewed, widths, keyboard pass> | … |

## Reviews
- qa-reviewer: <verdict + key findings>
- architecture-security-reviewer: <used / not needed because …>
- ux-policy-reviewer: <used / not needed because …>

## Secrets & scope
- No secret values in the diff (checked: <how>). `.env*` untouched except `.env.example` names.
- No scope beyond the Issue. Out-of-scope observations: <list or none>.

## Open questions / limitations
- <items for the human, or "none">
```

## 5. Definition of Done (for the agent)

A change is done only when **all** of the following are true:
- Every acceptance criterion in the Issue is met and maps to concrete evidence. Any criterion
  that is not met is stated explicitly.
- Lint, type-check, tests, and build pass locally (or are N/A with a reason), and CI is green on the PR.
- `qa-reviewer` has verified the work independently. The conditional reviewers have been used
  where their triggers apply.
- No secrets appear, no unapproved scope was added, and POLICY/ARCHITECTURE rules hold.
- The PR body includes the evidence template above.

When the merge gate (§3, step 4) is met, the agent may merge into `dev`. **The human** sets Human Review,
closes Issues, and controls every promotion to `staging`/`main`.

## 6. Manual verification for UI work

- Check at a mobile width (about 375 px) and a desktop width (about 1280 px). Confirm there is no horizontal overflow.
- Do a keyboard-only pass: confirm focus is visible and the tab order is logical.
- Check the loading, empty, and failure states, and the not-found state where applicable.
- Confirm the exact terminology and the disclaimer wording. Safety & Caution must appear before the instructions.
