# Agentic Retrospective: Lab 4

**Issue used:** [#7 (YF-02)](https://github.com/iimpandeyy/YogaFlow/issues/7), which initializes the Next.js/TypeScript app with Tailwind, lint, typecheck, tests and CI. Run on 2026-11-16 with the configuration from PR #27.

## Outcome

[PR #28](https://github.com/iimpandeyy/YogaFlow/pull/28) was merged into `dev` as `146cb5f`. All 6 acceptance criteria were met with evidence. CI was green ([run 43760019688](https://github.com/iimpandeyy/YogaFlow/actions/runs/43760019688)). Issue #7 was closed as completed, with Status set to **Done in Dev**. No application code beyond the Issue's scope was written, and nothing was promoted to `staging` or `main`.

## What worked without human correction

- **Readiness gate:** checked the agent identity, the Human Review field, dependencies and doc conflicts before planning.
- **Pre-coding check:** found that TypeScript 7 is incompatible with `typescript-eslint` (it requires a version below 6.1) before writing any code. The plan proposed 6.0.3.
- **Escalation instead of guessing:** the implementer raised Next.js writing `AGENTS.md` and the ESLint 10 peer mismatch instead of choosing a fix itself.
- **Independent QA:** `qa-reviewer` re-ran every check from a clean install. It refused to give a plain PASS until it had seen the CI log and done the manual 375/1280 px, keyboard and contrast checks.
- **Merge gate held:** the merge happened only after CI was green, QA said PASS and the gate comment was posted. The hook re-checked all three before allowing `gh pr merge`.
- **No secrets or scope creep:** nothing was committed beyond the Issue, and no agent worked around a hook block.

## Problems, surprises and interventions

| What happened                                                                                                                                                                | Root cause                                                                                                                                                                                                                                                 | Resolution                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **The hook wrongly blocked two harmless commands.** Both were searches whose _pattern_ contained `.env`: `ls -a \| grep -i '^\.env'` and a `grep -nE '…\.env…'` over a diff. | The env check treated **every token** as a possible file path, whatever its role. Node's `path.basename` treats `\` as a directory separator on Windows, so `'^\.env'` reduced to `.env`. The test suite covered only real file access, not harmless text. | The agents reported the blocks and used `git check-ignore` / `git ls-files` instead. This PR fixes the cause (see below). |
| Next.js 16 auto-generates `AGENTS.md` when it detects an agent                                                                                                               | A new framework default                                                                                                                                                                                                                                    | Human decision: `agentRules: false` keeps `CLAUDE.md` the only agent-instruction source                                   |
| ESLint 10 vs. plugins that declare support only up to ESLint 9                                                                                                               | Ecosystem lag                                                                                                                                                                                                                                              | Human accepted it; the rules were verified to fire                                                                        |
| 6 human decisions were needed: 4 at the plan stage, 2 mid-run                                                                                                                | Gaps in the Issue (no formatter named, how far to scaffold Playwright, review scope)                                                                                                                                                                       | Asked once at each stage, then recorded in the PR                                                                         |
| Setup: the device login authorized `iimpandeyy` three times; PR #27 was merged by the human under the `yyogaaflow` session                                                   | The browser's current GitHub account decides which account a device login authorizes                                                                                                                                                                       | Logged in from a dedicated private window. An audit note was posted on PR #27; history is unchanged                       |
| The Lead mistyped a Project field ID once                                                                                                                                    | Manual copying of IDs                                                                                                                                                                                                                                      | GitHub rejected it with no change made; the retry used the exact ID                                                       |
| Found after the merge: `npm run lint` fails on any fresh Windows checkout (20 files), while CI passes                                                                        | Git for Windows sets `core.autocrlf=true`, so files are checked out as CRLF while Prettier enforces LF. The repo had no `.gitattributes`. QA missed it because its working tree had been written as LF and never re-checked-out.                           | Human decision: this PR adds `.gitattributes` (`* text=auto eol=lf`). Committed content is unchanged                      |

## Testing and review evidence

| Source                    | Evidence                                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA (local, clean install) | `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test` (8/8) and `npm run build` (with no Supabase env) all passed. `npm run test:e2e`: 1/1 |
| CI                        | The log was verified step by step for head `6217d4c`; no secrets were used                                                                         |
| Manual checks             | No overflow at 375 or 1280 px; contrast 17.8:1 and 10.4:1; keyboard pass N/A                                                                       |
| Reviews                   | Architecture/security: OK, with 4 minor follow-ups. UX: skipped by owner decision (placeholder only)                                               |

## Delegation

The Lead (main session) ran the `yogaflow-issue` skill. It delegated the build to `implementation-engineer` once, then ran `qa-reviewer` and `architecture-security-reviewer` in parallel. It resumed QA once to close the CI and manual-check gaps. Specialists reported only to the Lead, raised escalations rather than deciding, and stayed within their tools. That was four specialist runs for a foundation Issue, which is proportionate.

## Git and PR behavior

- Branch `aidev/7-app-scaffold` was created from `origin/dev`.
- 2 commits as `YogaFlow AiDev`; pushed and PR opened as `yyogaaflow`.
- The PR body used the evidence template, and the gate comment was posted.
- Merged with `gh pr merge --merge --match-head-commit`.
- The upstream was unset so a bare `git push` can never target `dev`.

## Workflow improvement made (this PR)

**The env-file guard is now role-aware** (`.claude/hooks/guard.mjs`, `envAccessInSegment`). Instead of flagging any token that resembles `.env`, it classifies each argument by role:

- search patterns, `sed`/`awk` scripts, `echo` text, commit messages and metadata-only commands (`git check-ignore`, `ls-files`, `find` without `-exec`, `test -f`) → **allowed**;
- file arguments, redirect targets, env globs, `--include`/`--glob` filters, `--env-file=` values, `rev:path`, `$(…)` substitutions, `bash -c`/`pwsh -Command` wrappers and inline `node -e`/heredoc code → **denied**.

**Regression suite (committed):** `node .claude/hooks/guard.test.mjs` runs 144 deterministic cases, 154 with `--live`. Run against the previous guard, it shows **12 false positives fixed** (including both blocked commands) and **17 previously missed real accesses now denied**, such as `cat .env*`, `node -e "…readFileSync('.env')"`, `git show HEAD:.env` and `Get-Content -Path:.env`.

**Independent review caught regressions in my first fix.** On PR #29, `architecture-security-reviewer` returned CHANGES REQUESTED and `qa-reviewer` returned FAIL. My suite passed, but in two places the first version allowed real reads that the old guard blocked:

- a listing or text stage piped into a reader (`find . -name .env | xargs cat`, `Get-ChildItem .env | Get-Content`);
- a pattern supplied by an option, so the file argument was read as the pattern (`grep -f pats.txt .env`, `sed -f`, `awk -f`).

`git log -p .env` had also regressed. All of these are fixed: pipelines are now analyzed stage by stage, with quote-aware splitting, and pattern options are classified correctly. Each reported command is now a regression case. That was the gate working as intended: the implementer's own tests weren't treated as evidence.

**Dogfooding caught two more cases:**

- **The PR body was read as code.** The first version of the fix blocked this PR's own creation. It scanned Markdown inline code inside the quoted-heredoc PR body as if it were shell backtick substitutions. Substitutions are now read only from live shell text: the command itself, plus the bodies of _unquoted_ heredocs, which do expand `$(…)`.
- **A commit message was read as code.** A later commit was blocked because the guard decided whether a heredoc feeds an interpreter from the whole line, so `node … && git commit -F - <<EOF` treated the commit message as Node code. The guard now checks the heredoc's actual receiving command, including `cat <<EOF | bash`.

Both have regression cases in each direction.

**Also in this PR:** `.gitattributes` makes line endings LF on every platform, so `npm run lint` passes on Windows checkouts as well as in CI.

**Lesson for QA:** verify in a fresh checkout (`git clone` or a re-checkout), not only in the working tree the implementer used.

**Known gap, not addressed here:** the hook matcher doesn't include the Grep/Glob tools. That's pre-existing and needs a separate decision.

**Open for the next retrospective:**

- Whether to make CI a required status check on `dev`.
- Whether to upgrade the GitHub Actions versions (Node 20 deprecation warning).
- Whether to pin the GitHub Actions to commit SHAs before #21 adds secrets.
