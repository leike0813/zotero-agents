# Support Zotero 9 While Retaining Zotero 7

## Why

Zotero has advanced to the Zotero 9 / Firefox 140 runtime while this plugin
still declares compatibility only through Zotero 8. The observed runtime symptom
is that built-in workflows are sometimes not detected, even though the
`workflows_builtin` manifest is complete and node-side workflow loading passes.

The most likely failure point is startup synchronization of packaged
`workflows_builtin` resources into Zotero's data directory. That path currently
depends primarily on fetching `rootURI + "workflows_builtin/..."`, which is too
fragile across packaged, unpacked, Zotero 7, and Zotero 9 runtime URI shapes.

## What Changes

- Declare Zotero 7 through Zotero 9.0 compatibility in `manifest.json`.
- Harden built-in workflow resource reading with multiple runtime-safe source
  candidates and diagnostics.
- Surface built-in sync failures through workflow registry/debug diagnostics
  instead of leaving an empty workflow state unexplained.
- Consolidate high-risk runtime compatibility calls for delay, subprocess, and
  file/path helpers behind feature-detected helpers.
- Add regression coverage for packaged resource fallback behavior, manifest
  compatibility, and high-risk API usage.

## Capabilities

### Modified Capabilities

- `builtin-workflow-package-and-sync`: packaged workflow reads must work across
  Zotero 7 and Zotero 9 URI/resource shapes and expose clear diagnostics.
- `workflow-loader-contract-hardening`: registry/debug diagnostics must preserve
  sync failure context.
- `runtime-global-bridge-consolidation`: runtime compatibility helpers must
  centralize high-risk host API fallbacks.

## Impact

- Affects startup built-in workflow synchronization, workflow debug probe
  diagnostics, manifest compatibility metadata, and runtime compatibility
  helpers.
- Does not rename workflows, change workflow package layout, or drop Zotero 7.
- Does not modernize all menu/UI integration in this change.
