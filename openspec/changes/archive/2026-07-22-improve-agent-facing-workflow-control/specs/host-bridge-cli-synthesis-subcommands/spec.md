## MODIFIED Requirements

### Requirement: Index and registry CLI subcommands are cache views or removed
Host Bridge CLI guidance SHALL not present Synthesis index or Reference Sidecar Index subcommands as synchronized Zotero Library views.

#### Scenario: CLI help lists Synthesis commands
- **WHEN** `zotero-bridge synthesis graph --help` lists cache-backed commands
- **THEN** commands that expose reference or graph sidecar state SHALL be named or documented as cache views
- **AND** agent guidance SHALL prefer Zotero item/artifact read commands for current library facts.

### Requirement: CLI exposes topic-scoped citation graph cluster query
Host Bridge CLI SHALL provide a read-only Synthesis command for querying topic-scoped citation graph clusters.

#### Scenario: Topic graph cluster is queried
- **WHEN** an agent or runtime calls `zotero-bridge synthesis graph query-cluster`
- **THEN** the input SHALL accept source paper refs, include flags, max external nodes, and a documented `cluster_policy` enum
- **AND** the response SHALL include bounded cluster counts, edge summaries, canonical reference counts, unresolved counts, diagnostics, and graph stale status.

### Requirement: CLI exposes current Synthesis capability mappings
Host Bridge CLI Synthesis subcommands SHALL stay aligned with the Host Bridge capability registry through the generated surface catalog.

#### Scenario: Citation graph metric repair is exposed
- **WHEN** `zotero-bridge synthesis graph refresh-metrics` is invoked
- **THEN** the CLI SHALL call `citation_graph.refresh_metrics`
- **AND** Zotero-side approval SHALL remain required.

#### Scenario: Reference and graph maintenance are exposed
- **WHEN** an agent invokes `synthesis cache refresh-reference-sidecar` or `synthesis graph update`
- **THEN** the CLI calls the corresponding public maintenance capability
- **AND** returns a typed asynchronous operation handle.
