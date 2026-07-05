## Why

ACP Chat currently materializes only the Host Bridge wrapper skill into the active backend family's project skill roots. When a shared chat workspace contains stale skill copies under another agent-family root such as `.claude/skills`, an agent that reads that root can receive outdated Host Bridge guidance.

## What Changes

- Add `kilo` as a first-class ACP agent family with `.kilo/skills` as its project skill root.
- Change Kilo ACP presets to identify as `kilo` instead of `unknown`.
- Make ACP Chat materialize a whitelist of chat skills into every known project skill root, not only the selected backend family's roots.
- Include `zotero-bridge-cli` and `literature-search-ingest` in the ACP Chat injected-skill whitelist.
- Resolve every injected skill through the plugin skill registry effective entry so user and dev-local overrides keep their existing priority over official skills.

## Capabilities

### New Capabilities

### Modified Capabilities

- `acp-chat-session-management`: ACP Chat skill materialization changes from one Host Bridge wrapper in selected roots to a registry-backed whitelist copied into all known chat skill roots.
- `acp-skillrunner-compatible-runner`: ACP agent family resolution and project skill roots add Kilo as a known family.

## Impact

- Affected code: ACP agent-family resolver, ACP backend presets, ACP Chat session startup skill materialization, ACP Skills prompt path helpers.
- Affected tests: ACP family/root tests, backend preset regression tests, ACP Chat session manager tests.
- No dependency changes.
