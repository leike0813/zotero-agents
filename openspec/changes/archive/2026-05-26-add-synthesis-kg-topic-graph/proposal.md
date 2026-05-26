## Why

Synthesis currently stores topic artifacts independently, but it cannot express broader, related, overlapping, or contrasting relationships between topics. After Foundation and Tag Vocabulary, Topic Graph is the next KG phase because it validates canonical graph files, proposal ingestion, projection state, and Workbench graph organization against the existing topic synthesis lifecycle.

## What Changes

- Add a Synthesis Topic Graph domain backed by canonical files under `synthesis/topic-graph/`.
- Add deterministic topic node and edge models, root/top-level and Unplaced rules, proposal ingestion, diagnostics, and a rebuildable `topic-graph-index` projection model.
- Extend topic synthesis output with an optional relation proposal sidecar referenced by the final bundle.
- Ingest agent-authored relation proposals after successful topic synthesis apply without allowing agents to write canonical edges directly.
- Add Topics page graph mode with Hierarchy, Neighborhood, and Unplaced views plus a lightweight Topic Inspector.
- Keep existing Topics list/grid as secondary views.
- Do not implement Concept KB, Citation Graph, Git Sync, embedding, complex ontology inference, force-directed graph as the default Topics view, or drag-based graph editing.

## Capabilities

### New Capabilities

- `synthesis-topic-graph`: Canonical topic graph node/edge files, deterministic edge identity, proposal ingestion, projection state, diagnostics, and review rules.

### Modified Capabilities

- `synthesize-topic-workflow`: Add `stage_5_6_topic_graph_relation_proposals` and allow final bundles to reference a relation proposal sidecar.
- `topic-synthesis-structured-artifact`: Clarify that topic graph relation proposals are sidecar artifacts and do not become structured topic artifact sections.
- `synthesis-workbench-ui`: Add Topics graph mode, graph submodes, and Topic Inspector behavior.

## Impact

- Affects Synthesis service internals, topic synthesis result validation/apply, create/update topic synthesis skill packages, Workbench UI model/app, and focused tests.
- Adds no npm dependency and does not create a new public MCP or host bridge surface.
- Uses Foundation canonical transaction, diagnostics, and projection registry helpers.
