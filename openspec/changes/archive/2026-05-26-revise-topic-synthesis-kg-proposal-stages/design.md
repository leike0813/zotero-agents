## Overview

This change converts the concept card and topic graph relation proposal outputs from optional ad hoc sidecars into one explicit skill stage. The stage is semantic and agent-authored, but runtime-validated and registered like other run-local artifacts.

## Stage Placement

The new `persist_kg_proposals` action runs after `persist_core_sections` and before `persist_external_statistics_report`. At that point the agent has the cross-paper evidence map, taxonomy/timeline synthesis, and core analytical sections, which gives better context than early topic metadata while still letting the final report use the KG proposal thinking.

## Runtime Contract

`persist_kg_proposals` receives one combined payload at `runtime/payloads/kg-proposals.json`. Runtime validates the payload shape and writes two public sidecars:

- `result/sidecars/concept-cards-proposal.json`
- `result/sidecars/topic-graph-relation-proposals.json`

Both sidecars are required for completed runs. Empty proposal arrays are valid when the agent has no reliable proposal, but the files must still include diagnostics explaining the empty result.

## Host Compatibility

The host validator requires both path fields in completed v2 bundles. Host apply reads the provided new paths first. For transition compatibility, if a bundle from an older run points at the legacy paths, apply still reads those paths and ingests best-effort.

## Non-Goals

- No canonical concept, topic graph node, or edge writes from skill runtime.
- No structured topic artifact section for KG proposals.
- No new MCP tool, SQLite/FTS backend, npm dependency, or Workbench UI change.
