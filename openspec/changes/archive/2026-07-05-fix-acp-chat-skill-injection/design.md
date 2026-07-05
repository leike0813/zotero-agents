## Design

ACP Chat needs a broader materialization policy than ACP Skills runs. ACP Skills runs should continue to use the resolved backend family for the requested run, while ACP Chat uses a shared long-lived workspace that multiple ACP backends and agents may inspect. Therefore Chat should keep every known project skill root synchronized for its small set of always-available helper skills.

The plugin skill registry remains the only source of truth for skill content. ACP Chat will scan the registry once during session preparation and copy the effective registry entry for each whitelisted skill into each target root. This preserves the existing official < dev-local < user priority and avoids a separate checkout-specific lookup path.

Kilo is added to the normal agent-family model because it has a documented project skill root under `.kilo/skills`. It keeps the default `AGENTS.md` instruction filename because no separate Kilo instruction filename is part of the current contract.

## Rejected Alternatives

- Copy only to the active backend family's roots: this keeps the stale-root failure mode in shared ACP Chat workspaces.
- Prefer `skills_builtin/<skillId>` before registry lookup: this would bypass user and dev-local overrides and create a second source-priority policy.
- Treat Kilo as `unknown` with custom roots: this hides a known project skill root behind fallback behavior and makes preset behavior harder to reason about.
