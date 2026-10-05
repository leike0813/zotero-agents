## Purpose

Host Bridge CLI Synthesis commands distinguish cache views from current Zotero Library reads.
## Requirements
### Requirement: Index and registry CLI subcommands are cache views or removed
Host Bridge CLI guidance SHALL not present Synthesis index or Reference Sidecar Index subcommands as synchronized Zotero Library views.

#### Scenario: CLI help lists Synthesis commands
- **WHEN** `zotero-bridge synthesis graph --help` lists cache-backed commands
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

- **WHEN** an agent or runtime calls `zotero-bridge synthesis graph query-cluster`
- **THEN** the input SHALL accept source paper refs, include flags, max external nodes, and a documented `cluster_policy` enum
- **AND** the response SHALL include bounded cluster counts, edge summaries, canonical reference counts, unresolved counts, diagnostics, and graph stale status.

### Requirement: CLI exposes current Synthesis capability mappings

Host Bridge CLI Synthesis subcommands SHALL stay aligned with the Host Bridge
capability registry through the generated surface catalog.

#### Scenario: Paper artifact reads are exposed

- **WHEN** `zotero-bridge paper-artifacts read` is invoked
- **THEN** the CLI SHALL call `paper_artifacts.read`
- **AND** output SHALL remain bounded by the Host Bridge capability contract.

#### Scenario: Citation graph metric repair is exposed
- **WHEN** `zotero-bridge synthesis graph refresh-metrics` is invoked
- **THEN** the CLI SHALL call `citation_graph.refresh_metrics`
- **AND** Zotero-side approval SHALL remain required.

#### Scenario: Reference and graph maintenance are exposed
- **WHEN** an agent invokes `synthesis cache refresh-reference-sidecar` or `synthesis graph update`
- **THEN** the CLI calls the corresponding public maintenance capability
- **AND** returns a typed asynchronous operation handle.

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

### Requirement: CLI documents topic context views and file output

Host Bridge CLI Synthesis guidance SHALL document `topics get-context` as a
read-only command that supports explicit `digest`, `semantic`, `audit`, and
`full` views.

#### Scenario: Agent reads large topic context
- **WHEN** an agent needs a large topic context through `zotero-bridge topics get-context`
- **THEN** the guidance SHALL show using `view` to choose the payload boundary
- **AND** it SHALL show `outputPath` as the preferred way to avoid stdout
  truncation for large semantic or full views.

### Requirement: CLI exports topic planning context
The CLI SHALL provide `synthesis topic get-planning-context` as a read-only command that returns or writes the bounded library index, topic inventory, graph snapshot and hash, stored planning metadata, coverage inputs, and library index hash required by Topic Planner.

#### Scenario: Inline output is bounded
- **WHEN** the planning context fits the response boundary
- **THEN** the command returns the context in its normal structured output

#### Scenario: Local output path is requested
- **WHEN** the caller supplies `--output-path` in a local bridge session
- **THEN** the complete context is written to that path and the response identifies the file

#### Scenario: Remote output exceeds transport bounds
- **WHEN** a remote bridge cannot directly write the caller's local path or the payload exceeds inline limits
- **THEN** the command returns a downloadable product reference compatible with the existing file-download flow

### Requirement: CLI SHALL expose bounded Synthesis evidence search
The Rust CLI command `synthesis evidence search` SHALL invoke remote capability `synthesis.search_evidence` with the shared evidence-search request and result contract while preserving the existing JSON-container interpretation of `--query`.

#### Scenario: CLI evidence search is valid
- **WHEN** a caller supplies a valid JSON `--query` container with a non-empty query and optional scope or paging values
- **THEN** the CLI sends the contained plain query and declared fields through the existing Host Bridge capability call path
- **AND** it returns the typed status, method, coverage, issues, cursor, and exact-or-null total

#### Scenario: CLI evidence search is invalid
- **WHEN** the JSON container, query, scope, or paging values are invalid
- **THEN** the CLI returns the established validation error without dispatching the capability

### Requirement: CLI SHALL expose Topic lexical search

The Host Bridge CLI SHALL expose `zotero-bridge synthesis topic search` as a read-only command that invokes the existing `topics.search` capability and returns its shared bounded result.

#### Scenario: CLI executes Topic search
- **WHEN** a caller invokes `zotero-bridge synthesis topic search --query <json>` with a valid Topic search request
- **THEN** the CLI calls `topics.search` and preserves the query object, cursor, and result DTO without renaming the JSON `--query` container

#### Scenario: CLI receives invalid search input
- **WHEN** the request query is empty or violates the search bounds
- **THEN** the CLI reports the stable capability error and does not substitute Topic list or source-reference lookup

#### Scenario: CLI continues a search cursor
- **WHEN** the caller passes the opaque `nextCursor` in the next `--query` object
- **THEN** the CLI forwards it unchanged and surfaces stale or expired cursor errors without retrying the search
