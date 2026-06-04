## Why

MCP currently duplicates Host Bridge CLI capability schema, tool descriptions,
and auth behavior. That makes MCP drift away from the CLI and creates confusing
agent guidance. MCP should instead be a peer host capability broker for
third-party agents while ACP skill runs continue to use the Host Bridge CLI as
their default host access path.

## What Changes

- MCP server uses Host Bridge bearer-token authentication.
- MCP tools mirror Host Bridge capability names and call the Host Bridge
  capability registry instead of maintaining a separate tool registry.
- Preferences expose an MCP server enabled switch, defaulting to enabled.
- A third-party `zotero-bridge` wrapper skill is published under `assets`.
- A doc-sync check guards CLI docs, injected README, wrapper skill, and MCP
  capability wiring against obvious drift.

## Impact

- Affected code:
  - `src/modules/zoteroMcpServer.ts`
  - `src/modules/zoteroMcpProtocol.ts`
  - `src/hooks.ts`
  - preferences UI, prefs defaults, and locale files
  - `assets/wrapper-skills/zotero-bridge-cli/SKILL.md`
  - `scripts/check-host-bridge-doc-sync.ts`
- MCP tool names intentionally change to Host Bridge capability names.
- ACP internal host access remains Host Bridge CLI-first and does not use MCP as
  fallback.

