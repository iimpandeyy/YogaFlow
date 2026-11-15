#!/usr/bin/env node
// YogaFlow PreToolUse guard. Deterministic safeguards that must not depend on prompt compliance.
// - Identity: GitHub writes and pushes only as the agent account `yyogaaflow`; commits only with the AiDev author;
//   agents never approve PRs, read tokens, or switch to the human account.
// - Protected branches: no push / PR / merge into `main` or `staging`. Direct push to `dev` requires human
//   confirmation. A `dev` PR merge is allowed only when CI is green and a "Merge gate" comment records
//   qa-reviewer PASS and no open escalation (CLAUDE.md §3).
// - No branch-protection bypass: no --no-verify, no force-push to protected branches, no --all/--mirror, no --admin.
// - Secrets: no reading/writing `.env*` (except .env.example); no committing .env files or secret-looking values;
//   no writing secret-looking values into any file.
// - Production: no production Supabase migrations/pushes or Vercel production deploys by the agent.
// Output: PreToolUse JSON decision on stdout ("deny" or "ask"); exit 0. Silent exit 0 = no opinion.

import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROTECTED = new Set(["main", "staging"]);
const CONFIRM = new Set(["dev"]);
const AGENT_ACCOUNT = "yyogaaflow";
const AGENT_EMAIL = "yyogaaflow@gmail.com";
const HUMAN_ACCOUNT = "iimpandeyy";
const GH_WRITE_GROUPS = new Set(["pr", "issue", "project", "repo", "release", "label", "workflow", "run", "ruleset"]);

const SECRET_PATTERNS = [
  [/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, "JWT (Supabase anon/service-role key)"],
  [/sb_secret_[A-Za-z0-9_-]{10,}/, "Supabase secret key"],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, "GitHub token"],
  [/github_pat_[A-Za-z0-9_]{30,}/, "GitHub fine-grained token"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
  [/\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/, "API secret key"],
  [/\b(?:sk|rk)_live_[A-Za-z0-9]{16,}/, "Stripe live key"],
  [/postgres(?:ql)?:\/\/[^:\s/]+:[^@\s]+@(?!localhost|127\.0\.0\.1)[^\s'"]+/, "Postgres URL with password"],
  [/SUPABASE_SERVICE_ROLE(?:_KEY)?\s*[=:]\s*['"]?[A-Za-z0-9_.-]{8,}/, "service-role key value"],
];

const isEnvFile = (p) => {
  const b = path.basename(String(p).replace(/["']/g, ""));
  return /^\.env(\..+)?$/i.test(b) && b.toLowerCase() !== ".env.example";
};

function decide(decision, reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: decision, permissionDecisionReason: `[YogaFlow guard] ${reason}` },
  }));
  process.exit(0);
}
const deny = (r) => decide("deny", `${r} See CLAUDE.md §3/§7. Stop and report to the human; do not work around this.`);
const ask = (r) => decide("ask", r);

function findSecret(text) {
  if (!text) return null;
  for (const [re, label] of SECRET_PATTERNS) if (re.test(text)) return label;
  return null;
}

function git(cwd, args) {
  try { return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return ""; }
}

function tokenize(seg) {
  const out = []; const re = /"([^"]*)"|'([^']*)'|(\S+)/g; let m;
  while ((m = re.exec(seg))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

const branchOf = (ref, current) => {
  let r = ref.replace(/^\+/, "");
  if (r.includes(":")) r = r.split(":").pop();
  if (r === "HEAD" || r === "@") r = current;
  return r.replace(/^refs\/heads\//, "");
};

function checkGitPush(args, cwd) {
  const flags = args.filter((a) => a.startsWith("-"));
  const pos = args.filter((a) => !a.startsWith("-"));
  if (flags.includes("--no-verify")) deny("`git push --no-verify` bypasses hooks/checks.");
  if (flags.some((f) => f === "--all" || f === "--mirror")) deny("`git push --all/--mirror` could update protected branches.");
  const force = flags.some((f) => f === "-f" || /^--force/.test(f)) || pos.slice(1).some((r) => r.startsWith("+"));
  const current = git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
  const targets = pos.length > 1 ? pos.slice(1).map((r) => branchOf(r, current)) : [current];
  for (const t of targets) {
    if (PROTECTED.has(t)) deny(`Pushing to protected branch \`${t}\` is human-only. Push an aidev/* branch and open a PR into dev.`);
  }
  for (const t of targets) {
    if (CONFIRM.has(t)) ask(`Direct push to \`${t}\`. The normal path is a feature branch plus a PR into dev. Human confirmation required.`);
  }
  if (force) ask(`Force push to ${targets.join(", ")}. Confirm that this is your own feature branch.`);
  requireAgentIdentity(null, cwd, "`git push`");
}

function checkGitCommit(args, cwd) {
  if (args.some((a) => a === "--no-verify" || a === "-n")) deny("`git commit --no-verify` bypasses checks.");
  if (args.some((a) => a === "--author" || a.startsWith("--author="))) deny("Agents commit only as the configured AiDev author; do not use --author.");
  const email = git(cwd, ["config", "user.email"]).trim();
  if (email.toLowerCase() !== AGENT_EMAIL) deny(`Git author email is \`${email || "unset"}\`, not the agent identity \`${AGENT_EMAIL}\`.`);
  const all = args.some((a) => a === "-a" || a === "--all" || /^-[A-Za-z]*a/.test(a) && !a.startsWith("--"));
  const names = git(cwd, ["diff", "--cached", "--name-only"]) + (all ? git(cwd, ["diff", "--name-only"]) : "");
  const env = names.split(/\r?\n/).filter(Boolean).find(isEnvFile);
  if (env) deny(`Commit would include environment file \`${env}\`. Unstage it (git rm --cached) and keep it ignored.`);
  const diff = git(cwd, ["diff", "--cached", "-U0"]) + (all ? git(cwd, ["diff", "-U0"]) : "");
  const added = diff.split(/\r?\n/).filter((l) => l.startsWith("+") && !l.startsWith("+++")).join("\n");
  const hit = findSecret(added);
  if (hit) deny(`Staged changes appear to contain a secret (${hit}). Remove it before committing.`);
}

const GH_FALLBACK = "C:\\Users\\AiDev\\Tools\\gh\\bin\\gh.exe";

// Run gh (the invoked binary first, then PATH, then the known full path). Returns stdout+stderr, or null.
function runGh(ghBin, args, cwd) {
  for (const b of [ghBin, "gh", GH_FALLBACK].filter(Boolean)) {
    const r = spawnSync(b, args, { cwd, encoding: "utf8", timeout: 12000 });
    if (!r.error) return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
  }
  return null;
}

// Active GitHub CLI account (the identity used for gh writes and, via `gh auth setup-git`, for git push).
let activeUserCache;
function activeGhUser(ghBin, cwd) {
  if (activeUserCache !== undefined) return activeUserCache;
  const r = runGh(ghBin, ["auth", "status", "--active", "--hostname", "github.com"], cwd);
  activeUserCache = r?.out.match(/account\s+([A-Za-z0-9-]+)/)?.[1] ?? null;
  return activeUserCache;
}
function requireAgentIdentity(ghBin, cwd, action) {
  const user = activeGhUser(ghBin, cwd);
  if (user !== AGENT_ACCOUNT) {
    deny(`${action} must run as the agent account \`${AGENT_ACCOUNT}\`, but the active gh account is \`${user ?? "unknown"}\`. ` +
      `Run \`gh.exe auth switch --user ${AGENT_ACCOUNT}\` (or ask the human to log it in).`);
  }
}

// Pure merge-gate evaluation for a PR (gh pr view --json baseRefName,statusCheckRollup,comments).
// Returns null (allow) or [decision, reason].
export function evaluateMergeGate(pr) {
  if (!pr) return ["ask", "Could not read the PR (base, checks, comments). Human confirmation required."];
  const base = pr.baseRefName;
  if (PROTECTED.has(base)) return ["deny", `Merging into \`${base}\` is a human-controlled promotion (needs independent approval by ${HUMAN_ACCOUNT}).`];
  if (base !== "dev") return ["ask", `PR base is \`${base ?? "unknown"}\`, not \`dev\`. Human confirmation required.`];
  const checks = pr.statusCheckRollup ?? [];
  const okConclusions = ["SUCCESS", "NEUTRAL", "SKIPPED"];
  const notGreen = checks.filter((c) => (c.state !== undefined && c.status === undefined)
    ? String(c.state).toUpperCase() !== "SUCCESS"
    : String(c.status ?? "").toUpperCase() !== "COMPLETED" || !okConclusions.includes(String(c.conclusion ?? "").toUpperCase()));
  if (notGreen.length) {
    return ["deny", `dev merge gate: CI is not green (${notGreen.map((c) => c.name ?? c.context ?? "check").join(", ")}). Fix or wait; do not merge.`];
  }
  const gate = (pr.comments ?? []).some((c) => /^#{1,6}\s*Merge gate\b/im.test(c.body ?? "")
    && /^\s*-\s*qa-reviewer:\s*PASS\s*$/im.test(c.body ?? "")
    && /^\s*-\s*Escalations:\s*none\s*$/im.test(c.body ?? ""));
  if (!gate) {
    return ["deny", "dev merge gate: no PR comment with `### Merge gate`, `- qa-reviewer: PASS` and `- Escalations: none` " +
      "(docs/DEVELOPMENT.md §3). Post it only if every condition is genuinely met."];
  }
  if (!checks.length) return ["ask", "dev merge gate: this PR has no CI checks, so green CI cannot be verified. Human confirmation required."];
  return null;
}

function checkPrMerge(ghBin, args, cwd) {
  const sel = args.slice(2).find((a, i, arr) => !a.startsWith("-") && !/^--(body|subject|match-head-commit|author-email|repo)$/.test(arr[i - 1] ?? ""));
  const r = runGh(ghBin, ["pr", "view", ...(sel ? [sel] : []), "--json", "baseRefName,statusCheckRollup,comments"], cwd);
  let pr = null;
  try { if (r?.ok) pr = JSON.parse(r.out.slice(r.out.indexOf("{"))); } catch { pr = null; }
  const verdict = evaluateMergeGate(pr);
  if (verdict) decide(verdict[0], verdict[0] === "deny" ? `${verdict[1]} See CLAUDE.md §3.` : verdict[1]);
}

// Normalize a command token to its program name: "C:\...\gh.exe" -> "gh".
const prog = (tok) => path.basename(String(tok).replace(/\\/g, "/")).replace(/\.exe$/i, "").toLowerCase();

// Heredoc bodies are data (e.g. commit messages), not commands: drop them before analysis,
// unless the heredoc feeds a shell/interpreter, in which case its body is analyzed as commands.
const INTERPRETER = /(^|[\s/\\&|;(])(ba|z|da|k)?sh(\.exe)?\b|pwsh|powershell|\bnode\b|python|\bcmd\b|xargs|\beval\b|\bsource\b/i;
const stripHeredocs = (cmd) => cmd.replace(
  /^([^\n]*?)<<-?\s*(['"]?)(\w+)\2([^\n]*)\n[\s\S]*?\n[ \t]*\3[ \t]*(?=\n|$)/gm,
  (m, pre, _q, _tag, post) => (INTERPRETER.test(pre + post) ? m : `${pre}<<HEREDOC${post}`),
);

function checkShell(command, cwd) {
  for (const seg of stripHeredocs(command).split(/&&|\|\||[;|\n]/)) {
    const t = tokenize(seg.trim()).map((tok) => (["git", "gh", "supabase", "vercel"].includes(prog(tok)) ? prog(tok) : tok));
    const rawTokens = tokenize(seg.trim());
    if (!t.length) continue;
    const segLower = seg.toLowerCase();

    // Reading or exposing .env files through the shell (allow .gitignore edits, git check-ignore, git rm --cached).
    // A `git commit` segment's arguments are message text; its staged files are checked in checkGitCommit.
    const isCommit = t[t.indexOf("git") + 1] === "commit";
    const envTok = isCommit ? null : t.find(isEnvFile);
    if (envTok && !/gitignore|check-ignore|rm --cached/.test(segLower)) {
      deny(`Shell access to environment file \`${envTok}\` is not allowed. Secrets stay with the human.`);
    }

    const gi = t.indexOf("git");
    if (gi !== -1) {
      let i = gi + 1;
      while (i < t.length && (t[i] === "-C" || t[i] === "-c")) { // skip global options
        if (t[i] === "-c" && /^user\.(email|name)=/i.test(t[i + 1] ?? "")) deny("Overriding the git author identity with `-c user.*` is not allowed.");
        i += 2;
      }
      const sub = t[i]; const rest = t.slice(i + 1);
      const subCwd = t[gi + 1] === "-C" ? path.resolve(cwd, t[gi + 2]) : cwd;
      if (sub === "push") checkGitPush(rest, subCwd);
      if (sub === "commit") checkGitCommit(rest, subCwd);
      if (sub === "add" && rest.some(isEnvFile)) deny("Staging a `.env` file is not allowed.");
    }

    if (t.includes("gh")) {
      const g = t.slice(t.indexOf("gh") + 1);
      const ghBin = rawTokens[t.indexOf("gh")];
      if (g[0] === "auth") {
        if (g[1] === "token") deny("`gh auth token` would expose a credential.");
        if (g[1] === "switch") {
          const ui = g.findIndex((a) => a === "--user" || a === "-u");
          if (g[ui + 1] !== AGENT_ACCOUNT) deny(`Agents may only switch to \`${AGENT_ACCOUNT}\`. \`${HUMAN_ACCOUNT}\` is the human reviewer's identity.`);
        }
        if (g[1] === "logout") ask("Logging out a GitHub account. Human confirmation required.");
      }
      if (g[0] === "pr" && g[1] === "review" && g.some((a) => a === "--approve" || a === "-a")) {
        deny(`Agents never approve PRs. Independent approval is ${HUMAN_ACCOUNT}'s role.`);
      }
      if (g[0] === "secret" || (g[0] === "variable" && g[1] !== "list")) deny("Managing GitHub Actions secrets/variables is human-only.");
      const READ_ACTIONS = new Set(["view", "list", "status", "checks", "diff", "item-list", "field-list", "--help", "help"]);
      const writeApi = g[0] === "api" && g.some((a) => /^(-X|--method)$/.test(a) || /^--method=/.test(a) || /^-[fF]$/.test(a) || /^--(raw-)?field$/.test(a) || a === "--input");
      if (writeApi || (GH_WRITE_GROUPS.has(g[0]) && g[1] && !READ_ACTIONS.has(g[1]))) {
        requireAgentIdentity(ghBin, cwd, `\`gh ${g[0]} ${g[1] ?? ""}\``.replace(" `", "`"));
      }
      if (g[0] === "pr" && g[1] === "create") {
        const bi = g.findIndex((a) => a === "--base" || a === "-B");
        const base = bi !== -1 ? g[bi + 1] : (g.find((a) => a.startsWith("--base="))?.split("=")[1] ?? null);
        if (!base) ask("`gh pr create` has no --base. YogaFlow PRs must target `dev`; add `--base dev`.");
        if (PROTECTED.has(base)) deny(`PRs into \`${base}\` are human-controlled promotions. Target \`dev\`.`);
      }
      if (g[0] === "pr" && g[1] === "merge") {
        if (g.includes("--admin")) deny("`gh pr merge --admin` bypasses branch protection.");
        checkPrMerge(ghBin, g, cwd);
      }
      if (g[0] === "api" && /protection|rulesets/.test(segLower) && writeApi) deny("Changing branch protection or rulesets is human-only.");
    }

    if (t.includes("supabase")) {
      const s = t.slice(t.indexOf("supabase") + 1).join(" ");
      if (/^db push|^secrets|--linked|--db-url|^migration (up|repair)/.test(s)) {
        deny("Applying migrations, seeds, or secrets to a remote Supabase project is owner-only (content governance).");
      }
    }
    if (t.includes("vercel")) {
      const v = t.slice(t.indexOf("vercel") + 1);
      if (v.includes("--prod") || v.includes("--production") || ["promote", "alias", "rollback"].includes(v[0])) {
        deny("Production deploys and promotions are human-only.");
      }
      if (v[0] === "env") ask("`vercel env` handles credentials. Human confirmation required.");
    }
  }
}

// Run as a hook only when executed directly (tests import evaluateMergeGate without triggering this).
const isMain = process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
let raw = "";
if (isMain) {
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let input;
  try { input = JSON.parse(raw); } catch { process.exit(0); }
  const tool = input.tool_name ?? "";
  const ti = input.tool_input ?? {};
  const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

  if (tool === "Bash" || tool === "PowerShell") {
    checkShell(String(ti.command ?? ""), cwd);
  } else if (["Read", "Edit", "Write", "MultiEdit", "NotebookEdit"].includes(tool)) {
    const fp = ti.file_path ?? ti.notebook_path ?? "";
    if (isEnvFile(fp)) deny(`Access to environment file \`${path.basename(fp)}\` is not allowed (only .env.example, names only).`);
    if (tool !== "Read" && !/[\\/]\.claude[\\/]hooks[\\/]/.test(fp)) {
      const text = [ti.content, ti.new_string, ti.new_source, ...(ti.edits ?? []).map((e) => e.new_string)].filter(Boolean).join("\n");
      const hit = findSecret(text);
      if (hit) deny(`Content appears to contain a secret (${hit}). Use environment variables; never write values into files.`);
    }
  }
  process.exit(0);
});
}
