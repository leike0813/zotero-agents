# Design: Synthesis Topic Freshness Governance

## Freshness State

The service stores topic freshness in canonical
`synthesis/state/artifact-state.json`. The file is an envelope with
`schema_id = synthesis.artifact_state` and a `topics` map keyed by topic id.

Each topic entry stores the last computed status, coverage, baseline dependency
snapshot, current dependency snapshot, input hashes, stale reasons, and scan
timestamps. The dependency snapshot is plugin-owned and derived from canonical
state plus current projections; agent-provided `artifact_metadata` is not a
freshness source of truth.

## Scan Semantics

Scanning is deterministic and never starts an agent workflow. It recomputes the
current resolver result against the current Paper Registry, compares it with the
saved resolved paper set, compares paper artifact availability and hashes, reads
the persisted citation graph hash, and verifies canonical topic file/index
hashes.

If an active topic has no baseline yet, the first successful scan initializes the
baseline to the current dependency snapshot and logs `baseline_initialized`.
Missing or unparsable required canonical state marks the topic `dirty`.

`getSynthesisSnapshot()` performs a scan before building the snapshot, so opening
or refreshing Workbench updates the status. This change intentionally does not
add Zotero notifier watchers, debounce queues, or background rebuilds.

## UI And Context

The Artifacts table receives `fresh`, `stale`, `dirty`, or `unknown` from the
service and may show a compact reason summary. `getTopicContext(topicId)`
includes detailed freshness state for update workflows. `listTopics()` remains a
small semantic inventory and does not return freshness data.

## Mirror

`refreshMirror()` includes `artifact-state.json` as an `artifact_state` shard so
Zotero mirror/recovery can reflect active freshness baselines. Mirror failures do
not change scan results.
