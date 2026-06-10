## Purpose

Host Bridge CLI Synthesis commands distinguish cache views from current Zotero Library reads.
## Requirements
### Requirement: Index and registry CLI subcommands are cache views or removed
Host Bridge CLI guidance SHALL not present Synthesis index or Reference Sidecar Index subcommands as synchronized Zotero Library views.

#### Scenario: CLI help lists Synthesis commands
- **WHEN** `zotero-bridge citation-graph --help` lists cache-backed commands
- **THEN** commands that expose reference or graph sidecar state SHALL be named or documented as cache views
- **AND** agent guidance SHALL prefer Zotero item/artifact read commands for current library facts.

### Requirement: CLI does not expose queue control for Synthesis
The CLI SHALL NOT expose Synthesis queue drain, pause, resume, retry, WorkItem, or dirty-event controls as normal or debug Synthesis commands.

#### Scenario: Debug commands are listed
- **WHEN** Host Bridge CLI debug commands are listed
- **THEN** Synthesis debug commands SHALL include cache/operation diagnostics only
- **AND** queue-control commands SHALL be absent.

### Requirement: Synthesis resolver CLI input uses canonical wrapper
Host Bridge CLI guidance SHALL document Synthesis command input shapes precisely enough for agents to call semantic subcommands without using raw capability names.

#### Scenario: Resolver CLI input uses canonical wrapper
- **WHEN** an agent calls `zotero-bridge resolvers resolve`
- **THEN** the input SHALL be documented as a JSON object containing a top-level `resolver` field
- **AND** guidance SHALL reject `topic_resolver`, root-level `queries`, and the resolver object by itself as CLI input shapes.

### Requirement: CLI exposes Concept KB query for topic synthesis enrichment

Host Bridge CLI SHALL provide a read-only synthesis command for querying
Concept KB / alias index candidates needed by KG enrichment.

#### Scenario: Concept KB candidates are queried

- **WHEN** an agent or runtime calls `zotero-bridge concepts query`
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
  `zotero-bridge citation-graph query-cluster`
- **THEN** the input SHALL accept source paper refs, include flags, max external
  nodes, and a documented `cluster_policy` enum
- **AND** the response SHALL include bounded cluster counts, internal/external
  edge summaries, canonical reference counts, unresolved counts, diagnostics,
  and graph stale status.

### Requirement: CLI exposes current Synthesis capability mappings

Host Bridge CLI Synthesis subcommands SHALL stay aligned with the Host Bridge
capability registry through the generated surface catalog.

#### Scenario: Paper artifact reads are exposed

- **WHEN** `zotero-bridge paper-artifacts read` is invoked
- **THEN** the CLI SHALL call `paper_artifacts.read`
- **AND** output SHALL remain bounded by the Host Bridge capability contract.

#### Scenario: Citation graph metric repair is exposed

- **WHEN** `zotero-bridge citation-graph refresh-metrics` is invoked
- **THEN** the CLI SHALL call `citation_graph.refresh_metrics`
- **AND** Zotero-side approval SHALL remain required.

### Requirement: Schema discovery exposes executable contracts

Host Bridge schema discovery SHALL expose the contracts agents need to author
valid topic synthesis payloads.

#### Scenario: Topic synthesis schemas are requested

- **WHEN** `zotero-bridge schemas get` is called for topic synthesis
- **THEN** the response SHALL include actual output schema identifiers or
  schema bodies, stage payload schema manifest, enum definitions, artifact
  section schema summaries, and operation-specific CAS rules
- **AND** it SHALL distinguish create, update_full, and update_patch
  requirements.
