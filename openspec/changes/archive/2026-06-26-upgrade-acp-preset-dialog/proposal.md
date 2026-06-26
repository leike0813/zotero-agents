## Why

ACP preset creation is currently split between preset metadata and a simple
selector/add flow, which forces isolated variants to appear as separate preset
entries and gives users no chance to inspect command, args, or env before the
profile is appended.

## What Changes

- Replace the ACP preset selector/add flow with a confirmation dialog that
  lists agent presets, exposes `use npx` and `isolated environment` options,
  and shows a read-only backend profile preview before adding a row.
- Rework ACP presets to be agent-level entries with selectable launch and
  isolation options instead of separate `*-isolated` preset IDs.
- Default Codex and Claude Code presets to `use npx`; default other agents to
  bare commands; default all agents to non-isolated profiles.
- Change the built-in OpenCode ACP backend from `npx opencode-ai@latest acp` to
  `opencode acp`.
- Update only the Chinese documentation-site source for the new preset dialog
  flow; generated help docs are not rebuilt in this change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `backend-manager-ui`: ACP preset creation uses a configurable confirmation
  dialog and agent-level preset metadata.
- `acp-opencode-global-chat`: the built-in OpenCode ACP backend uses the bare
  OpenCode command.

## Impact

- Affected areas: ACP preset metadata, Backend Manager iframe UI, backend
  registry built-in rewrite behavior, localization, Chinese documentation-site
  source, and focused backend manager/provider registry tests.
- Compatibility: manual ACP profile editing and saving continue through the
  existing backend profile persistence path.
