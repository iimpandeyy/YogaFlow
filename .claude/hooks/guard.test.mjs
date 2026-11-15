#!/usr/bin/env node
// Regression tests for .claude/hooks/guard.mjs.
//   node .claude/hooks/guard.test.mjs          deterministic cases (no network)
//   node .claude/hooks/guard.test.mjs --live   also identity + live-PR cases (needs gh.exe, network)
// Test inputs that look like env files or secrets are assembled at runtime so this file's own
// tooling (and the guard itself) never sees them as literals.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GUARD = path.join(HERE, "guard.mjs");
const REPO = path.resolve(HERE, "..", "..");
const LIVE = process.argv.includes("--live");
const GH = "C:\\Users\\AiDev\\Tools\\gh\\bin\\gh.exe";
const E = "." + "env";
const JWT = "ey" + "JhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey" + "Jyb2xlIjoic2VydmljZV9yb2xlIn0.abcdefghijklmnop";
const sh = (command) => ({ command });

let pass = 0;
let total = 0;
const record = (ok, got, label) => {
  total++;
  if (ok) pass++;
  console.log(`${ok ? "ok      " : "MISMATCH"} ${String(got).padEnd(6)}${label}`);
};
// Deterministic cases run in a throwaway git repo with the agent author configured, so results never depend
// on the checkout they run in (a fresh clone has no local user.email). Only --live cases use the real repo.
const HERMETIC = fs.mkdtempSync(path.join(os.tmpdir(), "guard-hermetic-"));
execFileSync("git", ["init", "-q"], { cwd: HERMETIC });
execFileSync("git", ["config", "user.email", "yyogaaflow@gmail.com"], { cwd: HERMETIC });
execFileSync("git", ["config", "user.name", "YogaFlow AiDev"], { cwd: HERMETIC });
process.on("exit", () => fs.rmSync(HERMETIC, { recursive: true, force: true }));
const runGuard = (tool_name, tool_input, cwd = HERMETIC) => {
  const out = execFileSync("node", [GUARD], { input: JSON.stringify({ tool_name, tool_input, cwd }), encoding: "utf8" });
  return out ? JSON.parse(out).hookSpecificOutput.permissionDecision.toUpperCase() : "ALLOW";
};
const check = (label, tool, input, want, cwd = HERMETIC) => {
  const got = runGuard(tool, input, cwd);
  record(got === want, got, label);
};

// ---- 1. Env files: harmless text containing ".env" must be ALLOWED --------------------------------
console.log("# env: harmless text/search/metadata (expect ALLOW)");
[
  ["grep pattern on listing (blocked in the #7 run)", "Bash", `ls -a | grep -i '^\\${E}'`],
  ["grep -E pattern over a diff (blocked in the #7 run)", "Bash", `git diff origin/dev...HEAD | grep -nE 'eyJ|\\${E}|service_role'`],
  ["rg pattern, normal dir", "Bash", `rg -n "\\${E}" docs`],
  ["grep literal pattern, normal file", "Bash", `grep -rn "${E}" README.md`],
  ["grep -e pattern -- path", "Bash", `grep -n -e '${E}.local' -- CLAUDE.md`],
  ["git grep -e pattern", "Bash", `git grep -n -e '${E}.local' -- docs`],
  ["git log --grep text", "Bash", `git log --oneline --grep="${E}"`],
  ["sed script mentioning env", "Bash", `sed -n '/\\${E}/p' CLAUDE.md`],
  ["PowerShell Select-String -Pattern", "PowerShell", `Select-String -Pattern '\\${E}' -Path README.md`],
  ["echo text", "Bash", `echo "Copy ${E}.example to ${E}.local and fill in values"`],
  ["echo appended to .gitignore", "Bash", `echo ${E}.local >> .gitignore`],
  ["git check-ignore", "Bash", `git check-ignore -v --no-index ${E} ${E}.local ${E}.example`],
  ["git ls-files glob", "Bash", `git ls-files -- '${E}*'`],
  ["git rm --cached", "Bash", `git rm --cached ${E}.local`],
  ["find by name (no exec)", "Bash", `find . -name '${E}*' -not -path './node_modules/*'`],
  ["node -e using process.env", "Bash", `node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'unset')"`],
  ["cat .env.example", "Bash", `cat ${E}.example`],
  // Pipelines where the env-looking text is a pattern in the LAST stage, or no consumer follows.
  ["grep pattern | wc -l (no file consumer)", "Bash", `grep -n '\\${E}' README.md | wc -l`],
  ["rg --files | rg pattern (last stage)", "Bash", `rg --files | rg '\\${E}'`],
  ["quoted pipe inside grep -E pattern", "Bash", `git log --oneline | grep -E 'eyJ|\\${E}|x' | head -5`],
  ["git log --grep value (space-separated)", "Bash", `git log --oneline --grep "${E} files"`],
  ["names piped only into safe filters", "Bash", `ls -a | grep -i '\\${E}' | sort | head -5`],
  ["2>&1 | grep pattern", "Bash", `npm run build 2>&1 | grep -n '\\${E}'`],
  ["git status | grep pattern (last stage)", "Bash", `git status --short 2>&1 | grep '\\${E}'`],
  ["PS call operator with env text in pattern", "PowerShell", `& "C:\\Program Files\\Git\\cmd\\git.exe" log --oneline --grep="${E}"`],
  ["wrapped git commit heredoc (data)", "Bash", `timeout 60 git commit -q -F - <<'EOF'\nno ${E} access\nEOF`],
  ["PS Where-Object name filter (metadata)", "PowerShell", `Get-ChildItem -Force | Where-Object Name -like '${E}*' | Select-Object Name`],
  ["cat heredoc to file (data)", "Bash", `cat > notes.txt <<'EOF'\nsee ${E}.example\nEOF`],
  // Found while opening the retrospective PR: Markdown inline code in a quoted heredoc is inert text.
  ["quoted-heredoc PR body with markdown backticks", "Bash", `gh pr create --base dev --body-file - <<'EOF'\nDenied: \`grep KEY ${E}.local\`, \`$(cat ${E})\`\nEOF`],
  // Found when committing the PR #29 fixes: an earlier chained `node` command is not the heredoc's receiver.
  ["double-quoted-heredoc body with backticks", "Bash", `gh pr comment 1 --body-file - <<"EOF"\nSee \`cat ${E}.local\`\nEOF`],
].forEach(([label, tool, command]) => check(label, tool, sh(command), "ALLOW"));

// ---- 2. Env files: real access must still be DENIED -----------------------------------------------
console.log("# env: real secret-file access (expect DENY)");
[
  ["cat env", "Bash", `cat ${E}`],
  ["cat ./env.local", "Bash", `cat ./${E}.local`],
  ["PS type Windows path", "PowerShell", `type C:\\proj\\${E}`],
  ["PS Get-Content -Path", "PowerShell", `Get-Content -Path ${E}.production`],
  ["grep inside env file", "Bash", `grep SUPABASE ${E}.local`],
  ["grep -c (flag) then env file", "Bash", `grep -c KEY ${E}`],
  ["grep -f env (pattern file)", "Bash", `grep -f ${E} README.md`],
  ["PS Select-String -Path env", "PowerShell", `Select-String -Pattern KEY -Path ${E}`],
  ["sed -i on env", "Bash", `sed -i 's/a/b/' ${E}`],
  ["cp env.local out", "Bash", `cp ${E}.local backup.txt`],
  ["cp example to env.local (create)", "Bash", `cp ${E}.example ${E}.local`],
  ["redirect write > env", "Bash", `echo SECRET=x > ${E}`],
  ["redirect read < env", "Bash", `node app.js < ${E}`],
  ["heredoc piped into bash runs cat env", "Bash", `cat <<'EOF' | bash\ncat ${E}\nEOF`],
  ["source env", "Bash", `source ${E}`],
  ["command substitution", "Bash", `export $(cat ${E} | xargs)`],
  ["git add env.local", "Bash", `git add ${E}.local`],
  ["git add -f env", "Bash", `git add -f ${E}`],
  ["find -exec cat env", "Bash", `find . -name ${E} -exec cat {} ;`],
  // From the PR #29 security/QA review: name-producing stages piped into a file consumer.
  ["find | xargs cat", "Bash", `find . -name ${E} | xargs cat`],
  // A search pattern is masked only if nothing after it can open files: matched names fed to a reader stay denied.
  ["grep pattern names piped to xargs cat", "Bash", `ls -a | grep -i '^\\${E}' | xargs cat`],
  ["grep pattern names piped through head to cat", "Bash", `ls -a | grep '\\${E}' | head -1 | xargs cat`],
  ["PS Select-String names piped to Get-Content", "PowerShell", `gci -Name | Select-String '\\${E}' | Get-Content`],
  // From the narrowed-PR #29 review (security M1): a pattern the shell still EXECUTES is never masked.
  ["pattern with $(grep KEY env)", "Bash", `grep -rn "$(grep KEY ${E} | cut -d= -f2)" src/`],
  ["pattern with $(cut env)", "Bash", `grep -rn "$(cut -d= -f2 ${E} | head -1)" src/`],
  ["pattern with $(cd; cat env)", "Bash", `grep "$(cd x; cat ${E} )" f`],
  // Security m2 / m3 and QA: unknown or value-taking options mean NO masking (fail closed).
  ["PS Select-String -LP env", "PowerShell", `Select-String -LP ${E} KEY`],
  ["PS Select-String -PSPath env", "PowerShell", `Select-String -PSPath ${E} -Pattern KEY`],
  ["PS Select-String -Lit env", "PowerShell", `Select-String -Lit ${E} KEY`],
  ["rg --iglob env", "Bash", `rg --iglob ${E} KEY .`],
  ["rg --type-add env", "Bash", `rg --type-add 'e:${E}' -te KEY .`],
  ["grep --exclude-from env", "Bash", `grep --exclude-from ${E} KEY README.md`],
  ["rg --ignore-file env", "Bash", `rg --ignore-file ${E} KEY .`],
  ["grep -rne KEY env (combined -e)", "Bash", `grep -rne KEY ${E}`],
  ["find -print0 | xargs -0 cat", "Bash", `find . -name ${E} -print0 | xargs -0 cat`],
  ["find | while read; cat", "Bash", `find . -name ${E} | while read f; do cat $f; done`],
  ["find | xargs -I{} cp", "Bash", `find . -name ${E} | xargs -I{} cp {} /tmp/out`],
  ["ls -a env | xargs cat", "Bash", `ls -a ${E} | xargs cat`],
  ["git ls-files -o env | xargs cat", "Bash", `git ls-files -o ${E} | xargs cat`],
  ["echo env | xargs cat", "Bash", `echo ${E} | xargs cat`],
  ["printf env | xargs cat", "Bash", `printf '%s\\n' ${E} | xargs cat`],
  ["rg --files | rg env | xargs cat", "Bash", `rg --files -uu | rg ${E} | xargs cat`],
  ["PS Get-ChildItem | Get-Content", "PowerShell", `Get-ChildItem ${E} | Get-Content`],
  ["PS gci -Hidden -Filter | gc", "PowerShell", `gci -Hidden -Filter ${E}.local | gc`],
  ["PS ls | Get-Content", "PowerShell", `ls ${E} | Get-Content`],
  ["PS gci | ForEach-Object Get-Content", "PowerShell", `Get-ChildItem ${E} | ForEach-Object { Get-Content $_ }`],
  // From the review: pattern supplied by an option, so the next positional is a FILE.
  ["grep -f pats env", "Bash", `grep -f pats.txt ${E}`],
  ["grep --file=pats env", "Bash", `grep --file=pats.txt ${E}`],
  ["rg -f pats env", "Bash", `rg -f pats.txt ${E}`],
  ["grep -eKEY env (attached)", "Bash", `grep -eKEY ${E}`],
  ["grep -rne PAT env (combined)", "Bash", `grep -rne KEY ${E}`],
  ["sed -f script env", "Bash", `sed -f script.sed ${E}`],
  ["sed --expression=p env", "Bash", `sed --expression=p ${E}`],
  ["sed -ne p env", "Bash", `sed -ne p ${E}`],
  ["awk -f prog env", "Bash", `awk -f prog.awk ${E}`],
  ["findstr /g:pats env", "PowerShell", `findstr /g:pats.txt ${E}`],
  // From the review: git history pathspecs print committed content; PowerShell colon syntax; commit pathspec.
  ["git log -p env", "Bash", `git log -p ${E}`],
  ["git log -p -- env", "Bash", `git log -p -- ${E}`],
  ["git log --follow -p env.local", "Bash", `git log --follow -p ${E}.local`],
  ["git log --all -p env", "Bash", `git log --all -p ${E}`],
  // From the PR #29 round-2 review: wrappers before the heredoc receiver; splitter gaps; unlisted readers.
  ["sudo bash heredoc cat env", "Bash", `sudo bash <<'EOF'\ncat ${E}\nEOF`],
  ["env bash heredoc cat env", "Bash", `env bash <<'EOF'\ncat ${E}\nEOF`],
  ["command bash heredoc cat env", "Bash", `command bash <<'EOF'\ncat ${E}\nEOF`],
  ["heredoc | sudo bash cat env", "Bash", `cat <<'EOF' | sudo bash\ncat ${E}\nEOF`],
  ["background & then cat env", "Bash", `ls & cat ${E}`],
  ["echo & cat env", "Bash", `echo hi & cat ${E}`],
  ["find |& xargs cat", "Bash", `find . -name ${E} |& xargs cat`],
  ["escaped quote then ; cat env", "Bash", `echo "a\\"b" ; cat ${E}`],
  ["find | parallel cat", "Bash", `find . -name ${E} | parallel cat`],
  ["find | tar -T -", "Bash", `find . -name ${E} | tar -cf x.tar -T -`],
  ["find | bat", "Bash", `find . -name ${E} | bat`],
  ["PS gci | Import-Csv", "PowerShell", `gci ${E} | Import-Csv`],
  ["Read tool env.local", "Read", null],
  ["Write tool env", "Write", null],
].forEach(([label, tool, command]) => {
  const input = tool === "Read" ? { file_path: `C:/x/${E}.local` } : tool === "Write" ? { file_path: `C:/x/${E}`, content: "X=1" } : sh(command);
  check(label, tool, input, "DENY");
});

// ---- 2b. Known limitations: pre-existing guard behaviour, NOT asserted --------------------------------
// The previous guard (146cb5f) behaves the same way on all of these. Narrowing PR #29 to the search-pattern fix
// (owner decision) deliberately left them unchanged. They are printed for visibility; see the retrospective's
// follow-ups. KNOWN GAP = real env access the guard does not catch; KNOWN FP = harmless command it still blocks.
console.log("# known limitations (pre-existing; informational, not counted)");
[
  ["KNOWN GAP", "cat env glob", "Bash", `cat ${E}*`],
  ["KNOWN GAP", "grep --include env glob", "Bash", `grep -r KEY --include=${E}* .`],
  ["KNOWN GAP", "rg --glob env", "Bash", `rg KEY --glob '${E}*'`],
  ["KNOWN GAP", "redirect attached >env", "Bash", `echo SECRET=x >${E}.local`],
  ["KNOWN GAP", "node -e reads env", "Bash", `node -e "require('fs').readFileSync('${E}','utf8')"`],
  ["KNOWN GAP", "node heredoc reads env", "Bash", `node <<'EOF'\nconsole.log(require('fs').readFileSync('${E}.local','utf8'))\nEOF`],
  ["KNOWN GAP", "bash -c cat env", "Bash", `bash -c 'cat ${E}'`],
  ["KNOWN GAP", "chained cmd then node heredoc reads env", "Bash", `git status && node <<'EOF'\nrequire('fs').readFileSync('${E}')\nEOF`],
  ["KNOWN GAP", "pwsh -Command Get-Content env", "PowerShell", `pwsh -Command "Get-Content ${E}"`],
  ["KNOWN GAP", "node --env-file", "Bash", `node --env-file=${E} server.js`],
  ["KNOWN GAP", "unquoted heredoc expands $(cat env)", "Bash", `cat > out.txt <<EOF\n$(cat ${E})\nEOF`],
  ["KNOWN GAP", "unquoted heredoc expands backtick env", "Bash", `cat > out.txt <<EOF\n\`cat ${E}.local\`\nEOF`],
  ["KNOWN GAP", "git show rev:env", "Bash", `git show HEAD:${E}`],
  ["KNOWN GAP", "find glob | xargs cat", "Bash", `find . -name '${E}*' | xargs cat`],
  ["KNOWN GAP", "PS gci -Filter glob | Get-Content", "PowerShell", `Get-ChildItem -Filter ${E}* | Get-Content`],
  ["KNOWN GAP", "PS Get-Content -Path:env", "PowerShell", `Get-Content -Path:${E}`],
  ["KNOWN GAP", "PS Select-String -Path:env", "PowerShell", `Select-String -Pattern K -Path:${E}`],
  ["KNOWN GAP", "env bash -c cat env", "Bash", `env bash -c 'cat ${E}'`],
  ["KNOWN GAP", "git commit env pathspec first", "Bash", `git commit ${E} -m x`],
  ["KNOWN GAP", "rg --iglob env glob", "Bash", `rg --iglob '${E}*' KEY .`],
  ["KNOWN GAP", "git commit env pathspec last", "Bash", `git commit -m x ${E}`],
  ["KNOWN FP", "test -f existence check", "Bash", `test -f ${E} && echo present`],
  ["KNOWN FP", "echo names | tee list (writes names only)", "Bash", `echo ${E} | tee list.txt`],
  ["KNOWN FP", "node chained before git commit heredoc (text)", "Bash", `node x.js && git status && git commit -q -F - <<'EOF'\nmsg: no ${E} access; -p ${E}\nEOF`],
].forEach(([kind, label, tool, command]) => {
  console.log(`info     ${runGuard(tool, sh(command)).padEnd(6)}${kind}: ${label}`);
});

// ---- 3. Branches, bypasses, secrets in content, production (deterministic) ------------------------
console.log("# branches / bypass / secrets / production");
[
  ["push origin main", "Bash", sh("git push origin main"), "DENY"],
  ["push origin HEAD:staging", "Bash", sh("git push origin HEAD:staging"), "DENY"],
  ["push -f +x:main", "Bash", sh("git status && git push -f origin +feat:refs/heads/main"), "DENY"],
  ["push --all", "Bash", sh("git push --all origin"), "DENY"],
  ["push --delete origin main", "Bash", sh("git push --delete origin main"), "DENY"],
  ["push origin dev (direct)", "Bash", sh("git push origin dev"), "ASK"],
  ["push --no-verify", "Bash", sh("git push --no-verify origin aidev/7-x"), "DENY"],
  ["PS git -C . push origin main", "PowerShell", sh("git -C . push origin main"), "DENY"],
  ["PS git.exe full path push main", "PowerShell", sh('& "C:\\Program Files\\Git\\cmd\\git.exe" push origin main'), "DENY"],
  ["heredoc then push main", "Bash", sh("git commit -F - <<'EOF'\nmsg\nEOF\ngit push origin main"), "DENY"],
  ["bash heredoc hiding push main", "Bash", sh("bash <<'EOF'\ngit push origin main\nEOF"), "DENY"],
  // From the PR #29 round-2 review: wrapper before the heredoc receiver must not hide branch/merge rules.
  ["timeout bash heredoc push main", "Bash", sh("timeout 600 bash <<'EOF'\ngit push origin main\nEOF"), "DENY"],
  ["timeout bash heredoc merge --admin", "Bash", sh("timeout 600 bash <<'EOF'\ngh pr merge 29 --admin\nEOF"), "DENY"],
  ["nohup bash heredoc push --no-verify", "Bash", sh("nohup bash <<'EOF'\ngit push --no-verify origin aidev/x\nEOF"), "DENY"],
  ["env bash heredoc force-push dev", "Bash", sh("env CI=1 bash <<'EOF'\ngit push --force origin dev\nEOF"), "ASK"],
  ["commit --no-verify", "Bash", sh("git commit --no-verify -m x"), "DENY"],
  ["commit --author override", "Bash", sh('git commit --author="Someone <x@y.z>" -m x'), "DENY"],
  ["commit -c user.email override", "Bash", sh("git -c user.email=x@y.z commit -m x"), "DENY"],
  ["gh auth token", "Bash", sh("gh auth token"), "DENY"],
  ["gh auth switch to human", "Bash", sh("gh auth switch --user iimpandeyy"), "DENY"],
  ["gh auth switch to agent", "Bash", sh("gh auth switch --user yyogaaflow"), "ALLOW"],
  ["gh pr review --approve", "Bash", sh("gh pr review 27 --approve"), "DENY"],
  ["gh secret set", "Bash", sh("gh secret set SUPABASE_KEY"), "DENY"],
  ["gh pr create --base main", "Bash", sh("gh pr create --base main --title x"), "DENY"],
  ["gh pr merge --admin", "Bash", sh("gh pr merge 26 --admin"), "DENY"],
  ["gh api -X PUT protection", "Bash", sh("gh api -X PUT repos/o/r/branches/main/protection"), "DENY"],
  ["gh api --method DELETE rulesets", "Bash", sh("gh api --method DELETE repos/o/r/rulesets/1"), "DENY"],
  ["gh issue view (read)", "Bash", sh(`"${GH}" issue view 7`), "ALLOW"],
  ["npx supabase db push", "Bash", sh("npx supabase db push"), "DENY"],
  ["supabase db reset --linked", "Bash", sh("supabase db reset --linked"), "DENY"],
  ["supabase start (local)", "Bash", sh("supabase start"), "ALLOW"],
  ["vercel --prod", "Bash", sh("npx vercel --prod"), "DENY"],
  ["npm run lint && npm run test", "Bash", sh("npm run lint && npm run test"), "ALLOW"],
  ["Write JWT into code", "Write", { file_path: "C:/x/lib/db.ts", content: `k="${JWT}"` }, "DENY"],
  ["Edit service-role value", "Edit", { file_path: "C:/x/a.ts", old_string: "a", new_string: "SUPABASE_SERVICE_" + "ROLE_KEY=abc123secretvalue" }, "DENY"],
  ["Edit normal code", "Edit", { file_path: "C:/x/a.ts", old_string: "a", new_string: "const url = process.env.NEXT_PUBLIC_SUPABASE_URL;" }, "ALLOW"],
  ["Write env.example names only", "Write", { file_path: `C:/x/${E}.example`, content: "NEXT_PUBLIC_SUPABASE_URL=\n" }, "ALLOW"],
].forEach(([label, tool, input, want]) => check(label, tool, input, want));

// ---- 4. Commit-time scan in a throwaway repo -------------------------------------------------------
console.log("# commit-time scan (throwaway repo)");
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guard-test-"));
  const g = (...a) => execFileSync("git", a, { cwd: dir, stdio: "ignore" });
  const commit = () => runGuard("Bash", sh("git commit -m x"), dir);
  g("init", "-q");
  record(commit() === "DENY", commit(), "no author email configured");
  g("config", "user.email", "yyogaaflow@gmail.com");
  g("config", "user.name", "YogaFlow AiDev");
  // Commit messages that merely mention env files are text (hermetic: this repo sets its own author).
  const msgCases = [
    ["commit -m mentioning env (text)", `git commit -m "Ignore ${E}.local and ${E} files"`],
    ["commit heredoc mentioning env (text)", `git commit -q -F - <<'EOF'\nTitle\n\n- no ${E} access\n- (x | y)\nEOF`],
    ["commit -am message mentioning env (text)", `git commit -am "Document ${E}.local handling"`],
  ];
  for (const [label, command] of msgCases) {
    const got = runGuard("Bash", sh(command), dir);
    record(got === "ALLOW", got, label);
  }
  fs.writeFileSync(path.join(dir, E), "X=1\n");
  g("add", "-f", E);
  record(commit() === "DENY", commit(), "staged env file");
  g("rm", "-q", "--cached", E);
  fs.writeFileSync(path.join(dir, "a.ts"), `const k="${"sb_" + "secret_" + "abcdefghijklmnop123"}";\n`);
  g("add", "a.ts");
  record(commit() === "DENY", commit(), "staged fake secret");
  g("rm", "-q", "--cached", "a.ts");
  fs.writeFileSync(path.join(dir, "b.ts"), "export const ok = process.env.NEXT_PUBLIC_SUPABASE_URL;\n");
  g("add", "b.ts");
  record(commit() === "ALLOW", commit(), "staged clean code");
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---- 5. Merge-gate unit tests (pure function) -------------------------------------------------------
console.log("# merge gate (unit)");
{
  const { evaluateMergeGate } = await import(pathToFileURL(GUARD).href);
  const GATE = "### Merge gate\n- Checks: lint pass · typecheck pass · test pass · build pass · CI green\n- qa-reviewer: PASS\n- Escalations: none\n- Scope: Issue #7 only";
  const run = { name: "ci", status: "COMPLETED", conclusion: "SUCCESS" };
  [
    ["dev + green CI + gate comment", { baseRefName: "dev", statusCheckRollup: [run], comments: [{ body: GATE }] }, "ALLOW"],
    ["dev + failing CI", { baseRefName: "dev", statusCheckRollup: [{ ...run, conclusion: "FAILURE" }], comments: [{ body: GATE }] }, "DENY"],
    ["dev + pending CI", { baseRefName: "dev", statusCheckRollup: [{ name: "ci", status: "IN_PROGRESS", conclusion: "" }], comments: [{ body: GATE }] }, "DENY"],
    ["dev + failing status context", { baseRefName: "dev", statusCheckRollup: [{ context: "vercel", state: "FAILURE" }], comments: [{ body: GATE }] }, "DENY"],
    ["dev + green, no gate comment", { baseRefName: "dev", statusCheckRollup: [run], comments: [] }, "DENY"],
    ["dev + QA PASS WITH GAPS", { baseRefName: "dev", statusCheckRollup: [run], comments: [{ body: GATE.replace("PASS", "PASS WITH GAPS") }] }, "DENY"],
    ["dev + open escalation", { baseRefName: "dev", statusCheckRollup: [run], comments: [{ body: GATE.replace("none", "1 open (RLS)") }] }, "DENY"],
    ["dev + no CI checks + gate comment", { baseRefName: "dev", statusCheckRollup: [], comments: [{ body: GATE }] }, "ASK"],
    ["base main", { baseRefName: "main", statusCheckRollup: [run], comments: [{ body: GATE }] }, "DENY"],
    ["base staging", { baseRefName: "staging", statusCheckRollup: [run], comments: [{ body: GATE }] }, "DENY"],
    ["unreadable PR", null, "ASK"],
  ].forEach(([label, pr, want]) => {
    const v = evaluateMergeGate(pr);
    const got = v ? v[0].toUpperCase() : "ALLOW";
    record(got === want, got, `gate: ${label}`);
  });
}

// ---- 6. Live cases: identity + real PRs (opt-in) ----------------------------------------------------
if (LIVE) {
  const auth = spawnSync(GH, ["auth", "status", "--active", "--hostname", "github.com"], { encoding: "utf8" });
  const active = `${auth.stdout}${auth.stderr}`.match(/account\s+([A-Za-z0-9-]+)/)?.[1];
  const ID = (want) => (active === "yyogaaflow" ? want : "DENY");
  console.log(`# live (active gh account: ${active}; identity-gated cases expect ${active === "yyogaaflow" ? "ALLOW/ASK" : "DENY"})`);
  [
    ["push feature branch", "Bash", sh("git push -u origin aidev/example-branch"), ID("ALLOW")],
    ["push --force feature", "Bash", sh("git push --force origin aidev/7-x"), "ASK"],
    ["gh issue edit (write)", "Bash", sh(`"${GH}" issue edit 7 --body x`), ID("ALLOW")],
    ["gh pr comment (write)", "Bash", sh(`"${GH}" pr comment 27 --body x`), ID("ALLOW")],
    ["gh api -X PATCH (write)", "Bash", sh(`"${GH}" api -X PATCH repos/o/r/issues/7 -f body=x`), ID("ALLOW")],
    ["gh pr create --base dev", "Bash", sh(`"${GH}" pr create --base dev --title x`), ID("ALLOW")],
    ["gh pr create (no base)", "Bash", sh("gh pr create --title x"), ID("ASK")],
    ["gh pr merge 27 (dev, no gate comment)", "Bash", sh(`"${GH}" pr merge 27 --merge`), "DENY"],
    ["gh pr merge 2 (base staging)", "Bash", sh(`"${GH}" pr merge 2 --merge`), "DENY"],
    ["gh pr merge 99999 (unknown)", "Bash", sh(`"${GH}" pr merge 99999`), ID("ASK")],
  ].forEach(([label, tool, input, want]) => check(label, tool, input, want, REPO));
}

console.log(`RESULT: ${pass}/${total} passed${LIVE ? " (including live cases)" : " (deterministic; add --live for identity/PR cases)"}`);
process.exit(pass === total ? 0 : 1);
