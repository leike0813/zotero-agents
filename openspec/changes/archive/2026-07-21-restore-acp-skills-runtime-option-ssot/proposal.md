## Why

ACP Skills currently treats submitted run options, session-observed defaults, backend cache defaults, and mutable per-run snapshots as competing sources of the current runtime selection. This can replace an explicitly submitted model with a handshake default and makes recovery and UI projection diverge. The shared virtual transcript renderer also discards previously loaded pages when a tail page arrives and can apply stale bottom-stick work after the user scrolls away.

## What Changes

- Restore persisted `AcpSkillRunRecord.acp*` fields as the single owner of an ACP Skills run's effective mode, model, raw model, and reasoning selection.
- Restrict backend cache, live handshake data, and per-run runtime memory to normalized catalogs, observed defaults, and reasoning provenance.
- Apply the latest persisted run selection through one shared initial/recovery transport path; only a successful run-scoped user setter may update it.
- Preserve direct reply continuity without adding prompt-boundary model reapplication.
- Preserve all loaded transcript pages during tail-page and terminal mutations, reconcile keyed spacers, and restore a stable scroll anchor unless the user is still following the bottom.
- Keep canonical live-tail state separate from on-demand page responses and scope loading/empty state by owner.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `acp-skills-runtime-options`: Define run-effective runtime selections as run-owned state and separate them from shared catalog normalization.
- `acp-skills-interactive-execution`: Preserve the run-effective selection across initial execution, reply, explicit edits, repair, and recovery.
- `assistant-sidebar-ui`: Require lossless multi-page reconciliation, keyed virtual spacers, stable anchoring, and generation-safe bottom following.
- `assistant-workspace-publication-data-plane`: Separate canonical live-tail mutation state from on-demand page publications and scope loading state to its owner.

## Impact

The change affects ACP session option normalization, the ACP Skills run store and orchestrator, backend cache restoration, shared Assistant transcript rendering, Workspace publication coordination, and their focused specifications and tests. It does not change persisted run JSON shape, Workspace wire schema, transcript store format, provider-specific behavior, or release artifacts.
