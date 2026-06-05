## ADDED Requirements

### Requirement: CLI exposes Concept KB query for topic synthesis enrichment

Host Bridge CLI SHALL provide a read-only synthesis command for querying
Concept KB / alias index candidates needed by KG enrichment.

#### Scenario: Concept KB candidates are queried

- **WHEN** an agent or runtime calls `zotero-bridge synthesis query-concept-kb`
  with concept candidate labels and optional topic context
- **THEN** the command SHALL return bounded exact/alias/candidate matches and
  diagnostics
- **AND** it SHALL NOT mutate Concept KB, create review items, or start a
  background refresh.

### Requirement: CLI exposes topic-scoped citation graph cluster query

Host Bridge CLI SHALL provide a read-only synthesis command for querying
topic-scoped citation graph clusters.

#### Scenario: Topic graph cluster is queried

- **WHEN** an agent or runtime calls
  `zotero-bridge synthesis query-citation-graph-cluster`
- **THEN** the input SHALL accept source paper refs, include flags, max external
  nodes, and a documented `cluster_policy` enum
- **AND** the response SHALL include bounded cluster counts, internal/external
  edge summaries, canonical reference counts, unresolved counts, diagnostics,
  and graph stale status.

### Requirement: Schema discovery exposes executable contracts

Host Bridge schema discovery SHALL expose the contracts agents need to author
valid topic synthesis payloads.

#### Scenario: Topic synthesis schemas are requested

- **WHEN** `zotero-bridge synthesis get-schemas` is called for topic synthesis
- **THEN** the response SHALL include actual output schema identifiers or
  schema bodies, stage payload schema manifest, enum definitions, artifact
  section schema summaries, and operation-specific CAS rules
- **AND** it SHALL distinguish create, update_full, and update_patch
  requirements.
