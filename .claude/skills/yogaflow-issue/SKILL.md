---
name: yogaflow-issue
description: Standard YogaFlow workflow for taking one human-reviewed GitHub Issue from intake to plan, implementation, independent verification, and a PR with evidence. Use when asked to implement, work on, or start a YogaFlow Issue (for example "/yogaflow-issue 7" or "start Issue #9").
argument-hint: <issue-number>
---

# YogaFlow Issue workflow (the Lead runs this)

Target Issue: **#$ARGUMENTS**. If no number was given, ask for one.
Follow `CLAUDE.md` throughout. Its decision rights (§5) override convenience.

## 1. Intake and readiness gate (stop if any check fails)
1. Read the Issue: `"C:\Users\AiDev\Tools\gh\bin\gh.exe" issue view $ARGUMENTS --json title,body,state`.
   Extract the outcome, acceptance criteria, constraints, dependencies, SDD IDs, and Figma references.
2. **Human Review = Reviewed** must be set in the GitHub Project. Read it with:
   `gh.exe project item-list 1 --owner iimpandeyy --format json --limit 100` and find the Issue's item.
   The Issue *body* may still say "Pending" from when it was created; the Project field is the source
   of truth. If you cannot read the field, ask the human to confirm it. Do not assume.
3. Every dependency Issue must be closed or merged. If one is not, stop and report which.
4. Check that the Issue does not conflict with the SDD, ARCHITECTURE, or POLICY. If it does, stop and ask.

## 2. Plan (short; show it to the human before coding when the work is non-trivial)
- Branch: `aidev/$ARGUMENTS-<slug>`, created from the latest `origin/dev`.
- Map each acceptance criterion to the planned change and to how it will be verified.
- List the files or folders you expect to touch, and any new dependencies (each one needs human approval).
- Decide which conditional reviewers apply:
  - `architecture-security-reviewer`: data access, Supabase, env/secrets, dependencies, CI,
    permissions, or privacy boundaries.
  - `ux-policy-reviewer`: user-visible UI, copy, safety or wellness text, accessibility, terminology, or Figma.
- List the open questions. **Any "Ask the human" item from CLAUDE.md §5 is resolved before coding starts.**

## 3. Implement
- Small change: the Lead may implement it directly.
- Otherwise, delegate to `implementation-engineer` with the full acceptance criteria, the plan, the branch, and the
  human decisions. Treat what comes back as claims to verify.
- Stay within scope. Anything else you notice goes into "follow-ups" and is not built.

## 4. Verify (evidence before confidence)
1. Run `qa-reviewer` with the verbatim acceptance criteria, the diff range (`origin/dev...HEAD`), and the
   implementer's summary.
2. Run whichever conditional reviewers from step 2 apply, in parallel where possible.
3. If a finding is a defect inside scope, fix it and re-run QA. If it is a **HUMAN DECISION REQUIRED**
   item, stop and ask. Two failed fix attempts on the same check also mean stop and report.
4. Proceed only when QA says `PASS` (or `PASS WITH GAPS`, with every gap disclosed to the human).

## 5. PR with evidence, then the dev merge gate
1. Push the feature branch (the hook blocks protected branches; never work around it).
2. Open a PR **into `dev`** (`gh.exe pr create --base dev`). Fill in the evidence template from
   `docs/DEVELOPMENT.md` §4 with real command results, the reviewer verdicts, and any open questions.
3. Wait for CI (`gh.exe pr checks <n> --watch` once CI exists) and confirm it is green.
4. **Merge gate (CLAUDE.md §3).** Merge only if all of these hold:
   - the checks pass and CI is green;
   - QA returned `PASS`;
   - no escalation is unresolved;
   - the PR contains only the Issue's scope.

   Post a PR comment listing the gate evidence, then run `gh.exe pr merge <n> --merge`.
   If any condition is unmet or uncertain, leave the PR open and report to the human.
5. Never close the Issue, change Human Review or Status, or touch `staging`/`main`.
   Those belong to the human.

## 6. Report to the human (concise)
The Issue and branch, the PR link and whether it was merged into `dev` (with gate evidence or the reason
it was not merged), the criteria with their evidence, the check results, the reviewer verdicts, the decisions
needed, and the follow-ups.
