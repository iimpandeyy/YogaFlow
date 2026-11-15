import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CLAUDE.md is the single source of agent instructions (owner decision, 2026-11-16):
  // stop `next dev` from generating its own AGENTS.md agent-rules file.
  agentRules: false,
};

export default nextConfig;
