## Why

The preferences pane still exposes persistence monitoring through the old
runtime category usage and cleanup contract. After the persistence governance
change, users need the pane to show the managed `zotero-agents` root,
integrity issues, and report-first cleanup rules so durable Synthesis data is
not treated as cleanable runtime data.

## What Changes

- Add a preferences-facing persistence governance scan that combines runtime
  usage with the persistence integrity report.
- Add a preferences cleanup event that calls the report-first integrity cleanup
  API by issue id, with dry-run as the default behavior.
- Update the preferences runtime data panel to display usage categories and
  integrity issues while preserving existing `runtime-data-*` DOM ids.
- Keep old runtime usage and category cleanup helpers as low-level APIs, but
  stop using category cleanup as the preferences panel's main path.
- Ensure `data/synthesis` and `state/zotero-agents.db` are diagnostic-only and
  never cleaned by the preferences panel.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `runtime-persistence-governance`: preferences monitoring must use the
  persistence governance scan and issue-based cleanup contract.

## Impact

- Preferences UI script and localization for the storage monitoring panel.
- Preferences event handling in plugin hooks.
- Runtime persistence governance tests and preferences UI tests.
- No new dependencies, no automatic migration, and no changes to persistence
  root resolution.
