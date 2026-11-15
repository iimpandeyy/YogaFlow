# Agentic Retrospective: Lab 4

**Issue used:** [#7 (YF-02)](https://github.com/iimpandeyy/YogaFlow/issues/7), which initializes the Next.js/TypeScript app with Tailwind, lint, typecheck, tests and CI. Run on 2026-11-16 with the configuration from PR #27.

## Outcome

[PR #28](https://github.com/iimpandeyy/YogaFlow/pull/28) was merged into `dev` as `146cb5f`. All 6 acceptance criteria were met with evidence, and CI was green ([run 43760019688](https://github.com/iimpandeyy/YogaFlow/actions/runs/43760019688)). Issue #7 was closed as completed, with Status set to **Done in Dev**. No code beyond the Issue's scope was written, and nothing was promoted to `staging` or `main`.

## What worked without human correction

- **Readiness gate:** checked the identity, Human Review, dependencies and doc conflicts before planning.
- **TypeScript compatibility:** spotted before coding that TypeScript 7 doesn't work with `typescript-eslint`, and proposed 6.0.3.
- **Escalation instead of guessing:** the implementer raised Next.js writing `AGENTS.md` and the ESLint 10 peer mismatch rather than choosing a fix.
- **Independent QA:** QA re-ran every check from a clean install. It gave PASS only after seeing the CI log and doing the 375/1280 px, keyboard and contrast checks.
- **Merge gate:** the merge happened only with green CI, QA PASS and the gate comment posted. The hook re-checked all three. No secrets, no scope creep, and no agent worked around a hook block.

## Problems, root causes and interventions

| What happened                                                                                                                                                         | Root cause                                                                                                                                        | Resolution                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **The hook blocked two harmless commands**: `ls -a \| grep -i '^\.env'` and a `grep -nE '…\.env…'` over a diff. In both, `.env` was only inside the search _pattern_. | The env check treated every token as a possible file path. On Windows, `path.basename` splits on `\`, so `'^\.env'` became `.env`.                | The agents reported the blocks and used `git check-ignore` / `ls-files` instead. Fixed in PR #29 (below). |
| Next.js 16 writes `AGENTS.md` when it detects an agent                                                                                                                | A new framework default                                                                                                                           | Owner decision: `agentRules: false`                                                                       |
| ESLint 10 vs. plugins that declare support only up to ESLint 9                                                                                                        | Ecosystem lag                                                                                                                                     | Owner accepted it; the rules were verified to fire                                                        |
| 6 owner decisions were needed (4 at plan time, 2 mid-run)                                                                                                             | The Issue left choices open (formatter, Playwright scope, review scope)                                                                           | Asked once per stage and recorded in the PR                                                               |
| `npm run lint` failed on fresh Windows checkouts while CI passed                                                                                                      | `core.autocrlf=true` makes Windows checkouts CRLF, but Prettier enforces LF; there was no `.gitattributes`. QA had never tested a fresh checkout. | Owner decision: PR #29 adds `.gitattributes` (`eol=lf`)                                                   |
| Setup: the device login authorized the human account three times; PR #27 was merged in the agent's browser session                                                    | The device flow authorizes whichever GitHub account the browser has signed in                                                                     | Used a private window. An audit note was posted on PR #27                                                 |

## Testing and review evidence

| Source             | Evidence                                                                          |
| ------------------ | --------------------------------------------------------------------------------- |
| QA (clean install) | lint, typecheck, test (8/8), build (no Supabase env) and test:e2e (1/1) all pass  |
| CI                 | Every step verified for head `6217d4c`; no secrets used                           |
| Manual checks      | No overflow at 375/1280 px; contrast 17.8:1 and 10.4:1                            |
| Reviews            | Architecture/security: OK, with 4 minor follow-ups. UX: skipped by owner decision |

## Delegation, Git and PRs

The Lead ran the `yogaflow-issue` skill. It delegated the build to `implementation-engineer` once, ran `qa-reviewer` and `architecture-security-reviewer` in parallel, and resumed QA once to close the CI and manual-check gaps. Specialists reported only to the Lead and escalated rather than deciding.

Git and PR behavior:

- Work happened on a feature branch from `origin/dev`, with 2 commits as `YogaFlow AiDev`.
- The push and PR were made as `yyogaaflow`, with the evidence template filled in.
- The gate comment was posted, then `gh pr merge --merge --match-head-commit`.

## Workflow improvement (PR #29) and what reviewing it taught

**Final fix (narrow, owner-approved):** the old guard logic is kept unchanged, with one addition. Before the checks run, the **pattern argument** of `grep`/`rg`/`git grep`/`Select-String` is masked as text. It's masked only under three conditions. Otherwise nothing is masked, and every token is checked by the old logic.

- Every option is on a known allowlist for that command. Unknown options such as `--iglob`, `-f`, `-eKEY` or `-LP` fail closed, and `sed`/`awk` are never masked.
- The pattern contains nothing the shell would still run, such as `$(…)` or backticks.
- Nothing after it in the pipeline can open files.

Against the old guard, the committed suite (`node .claude/hooks/guard.test.mjs`) shows that the only change is **13 search-pattern commands now allowed**, including both #7 commands. Every real-access case in the suite, and in the reviewers' roughly 300-command comparison harnesses, matches the old guard, apart from relaxations the reviewer classed as harmless. The suite runs 159 deterministic cases (169 with `--live`), each in a throwaway git repo.

Even the narrowed version needed one more round. Security review found that masking hid a `$(…)` that the shell still ran, and QA found that unlisted value-taking options were misread as the pattern. Both were fixed by failing closed.

**How it got there:** my first version tried to make the guard "role-aware" everywhere, covering heredocs, pipelines and metadata commands, and to close extra gaps along the way. It passed my own tests, but independent review failed it **three rounds in a row**:

- pipeline bypasses (`find … | xargs cat`);
- option-supplied patterns (`grep -f pats .env`);
- wrapper-hidden heredocs (`timeout 600 bash <<EOF … git push origin main`);
- a script written and then run on the same line;
- PowerShell escaping.

The guard also blocked its own PR and commits twice. The owner chose to narrow the change. The narrowed version had one more edge, a masked pattern whose names were piped into `xargs cat`, and old-vs-new comparison caught it before review.

**Lessons:**

1. Treat the implementer's tests as claims; independent adversarial review found what they missed.
2. Make the smallest change that fixes the observed problem. Scope creep in a security control multiplies the attack surface.
3. Compare old and new behavior over many commands, and prefer allowlists to denylists.
4. QA should verify in a fresh checkout.

**Follow-ups (not done):**

- The 21 pre-existing guard gaps and 3 false positives, listed as "known limitations" in the suite. Examples: `cat .env*`, `bash -c 'cat .env'`, `node -e` reads, `git show HEAD:.env`.
- The hook matcher doesn't cover the Grep/Glob tools.
- Whether to make CI a required check on `dev`.
- Whether to upgrade the GitHub Actions or pin them to commit SHAs (they log a Node 20 deprecation warning).
