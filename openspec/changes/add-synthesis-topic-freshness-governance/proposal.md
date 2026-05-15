# Change: Add Synthesis Topic Freshness Governance

## Why

Synthesis Workbench currently reports every topic synthesis artifact as `fresh`
even when the resolver result, paper-level derived artifacts, citation graph, or
canonical files have changed. This hides one of the main responsibilities of the
Synthesis Layer: telling users when a topic synthesis is still reusable and when
it should be updated.

## What Changes

- Add deterministic topic freshness scans owned by the plugin.
- Persist scan state in canonical `synthesis/state/artifact-state.json`.
- Compute freshness from resolver results, resolved paper sets, Paper Registry
  hashes, persisted graph hash, and canonical file hashes.
- Initialize missing legacy baselines from the current state on first scan.
- Surface `fresh`, `stale`, `dirty`, and `unknown` in Workbench snapshots and
  topic context without exposing freshness in `list_topics`.
- Include artifact state in Zotero mirror shards.

## Impact

- Specs: `synthesis-layer-integration`, `synthesis-tab-ui`,
  `synthesis-mcp-tools`
- Code: synthesis service, UI model, mirror payloads, Workbench snapshot path
- Tests: synthesis integration, UI model, MCP/context tests
