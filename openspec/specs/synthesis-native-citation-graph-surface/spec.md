# synthesis-native-citation-graph-surface Specification

## Purpose
TBD - created by archiving change complete-synthesis-native-citation-graph-surface. Update Purpose after archive.
## Requirements
### Requirement: Citation Graph public operations SHALL be native and compatible

The native surface SHALL implement exactly the twelve Citation Graph operations assigned by the R9a operation-ownership matrix while preserving public requests, result DTOs, deterministic ordering, pagination, and stable failures.

#### Scenario: A graph read is requested
- **WHEN** a caller requests a graph, cluster, slice, layout, metrics, or library ranking
- **THEN** Rust returns the compatible projection for one coherent basis
- **AND** it does not invoke the legacy graph service

### Requirement: Citation Graph mutations SHALL decode only public command DTOs

The native command boundary SHALL expose `startUpdate`, `refreshMetricsNow`,
`recomputeCitationGraphLayout`, `rebuildCitationGraphCacheNow`,
`refreshCitationGraphCacheIncrementalNow`, and
`retryCitationGraphCacheRebuild`. Internal worker build, metrics, and layout
requests SHALL be assembled inside Rust and SHALL NOT cross the public RPC
boundary.

#### Scenario: A no-argument cache command is invoked
- **WHEN** a caller invokes full rebuild, incremental refresh, or failed rebuild retry with an empty argument list
- **THEN** Rust accepts the command without attempting to decode an internal rebuild request
- **AND** any supplied argument is rejected as `invalid_request`

#### Scenario: A scoped update is invoked
- **WHEN** `startUpdate` receives an omitted request or a supported full or source-slice scope
- **THEN** Rust collects current Host metadata and durable reference facts for that scope
- **AND** it constructs the bounded internal build request itself

#### Scenario: Metrics or layout is invoked
- **WHEN** metrics refresh omits a graph hash or layout receives its public algorithm and optional force flag
- **THEN** Rust derives the active graph hash, view key, layout key, and worker DTO from durable graph state
- **AND** metrics refresh does not read Host metadata

### Requirement: Citation Graph reads SHALL share one public projection

The six native Citation Graph reads and the Workbench graph surface SHALL be
derived from one coherent repository snapshot. Public responses SHALL use the
contract node, edge, metrics, layout, pagination, and diagnostic fields and
SHALL NOT expose repository records, serialized `layoutJson`, internal layout
keys, or worker result DTOs.

#### Scenario: Workbench reads a rebuilt graph
- **WHEN** the active graph contains library and reference rows
- **THEN** the graph surface returns its active graph hash, visible and hover-only nodes and edges, cache diagnostics, layout status, and topic scopes
- **AND** the UI does not depend on a reverse-Host read

#### Scenario: A public graph read is invoked
- **WHEN** overview, cluster, slice, layout, metrics, or library ranking is read
- **THEN** Rust applies the public request defaults and bounds and returns only public DTO fields
- **AND** all rows and hashes belong to the same captured graph basis

### Requirement: Persisted Citation Graph layout SHALL use the public layout format

Native layout computation SHALL validate the worker result and persist a
normalized layout containing snake-case identity fields, layout version,
algorithm, parameters, a node-ID coordinate map, and a canonical layout hash.

#### Scenario: A legacy raw worker layout is read
- **WHEN** the stored JSON contains the worker node array instead of the normalized coordinate map
- **THEN** the layout is reported as stale and its coordinates are not applied
- **AND** automatic recomputation may replace it without a schema migration

#### Scenario: A layout is ready
- **WHEN** the layout graph hash and version match and every displayed node has finite coordinates
- **THEN** Workbench returns `ready` and attaches the coordinates
- **AND** a missing, stale, or failed layout does not hide the last-good graph

### Requirement: Citation compute and cache jobs SHALL use bounded typed ports

Library input SHALL be collected only through the declared paged reverse-Host port, compute SHALL execute through the native worker port, and cache/job state SHALL be persisted through Rust durable owners.

#### Scenario: A refresh job succeeds
- **WHEN** all Host pages share the expected source revision and native compute completes before its deadline
- **THEN** the runtime atomically publishes the new cache and terminal job receipt

#### Scenario: Host input or compute fails
- **WHEN** Host state disconnects, changes revision, exceeds bounds, or worker execution fails or expires
- **THEN** the previous valid cache remains readable
- **AND** the job records the stable retryable or terminal failure without partial publication

#### Scenario: Host input is paged
- **WHEN** Rust collects library items or artifact descriptors
- **THEN** every page SHALL preserve one snapshot revision, echo the requested cursor, advance a non-repeating cursor, and stay within page and total limits
- **AND** item collection SHALL reject duplicate paper refs
- **AND** the collected input SHALL be deterministically sorted before worker admission

### Requirement: Citation cache retry SHALL restore command intent

Full and source-slice rebuild attempts SHALL persist distinct terminal operation
types. Retry SHALL select the most recent failed rebuild intent after restart and
SHALL collect fresh Host and durable reference state instead of replaying a
stored worker payload.

#### Scenario: An incremental rebuild is retried after restart
- **WHEN** the latest failed rebuild receipt records source-slice intent
- **THEN** retry reopens a source-slice operation using the currently recorded stale delta
- **AND** unrelated graph source rows remain unchanged

#### Scenario: Incremental scope is unavailable
- **WHEN** an explicit incremental command has no usable stale delta or no active graph
- **THEN** it runs an explicit full rebuild and records full intent

### Requirement: Citation readiness SHALL be proven per operation

Every owned Citation Graph operation SHALL pass differential and restart fixtures before ready-roster admission.

#### Scenario: Only registry completeness passes
- **WHEN** a capability has a registered handler but lacks compatible output, durable job, retry, or deadline evidence
- **THEN** the capability remains not ready

### Requirement: Citation Graph reads SHALL return bounded deterministic windows
The native Citation Graph read surface SHALL return a versioned basis-bound page with bounded primary node, primary edge, hover node, and hover edge streams; stable totals and returned counts; a query signature; an optional opaque continuation cursor; and a `loading`, `complete`, `paused`, or `failed` window status. The runtime SHALL keep the serialized page at or below 768 KiB and every returned edge SHALL have both endpoint nodes in the same page.

#### Scenario: A large graph is read
- **WHEN** a graph containing more than 7,500 nodes and 12,000 edges is read with default limits
- **THEN** the runtime returns a deterministic first page below the RPC limit with a continuation cursor and no dangling edge

#### Scenario: All pages are merged
- **WHEN** a consumer follows every cursor for an unchanged basis and query
- **THEN** the merged node and edge ID sets equal the complete filtered source graph without duplicates

### Requirement: Citation Graph cursors SHALL fail closed on stale basis
The native surface SHALL bind cursors and neighborhood reads to the graph hash and normalized query signature, SHALL limit cursor length before decoding, and SHALL return `basis_mismatch` when the graph or query basis differs.

#### Scenario: Graph changes between pages
- **WHEN** a continuation cursor is submitted with a different current graph hash
- **THEN** the read fails with `basis_mismatch` and returns no page data

#### Scenario: Filters change between pages
- **WHEN** a continuation cursor is submitted with a different normalized filter or search query
- **THEN** the read fails with `basis_mismatch` and returns no page data

### Requirement: Citation Graph filtering SHALL apply before paging
Topic, node type, role, low-signal, and ID/title/author search predicates SHALL apply to the complete graph at the repository/runtime boundary before totals, ordering, and page limits are evaluated. Role options SHALL represent the complete filtered basis through a bounded distinct-role result.

#### Scenario: A match is outside the former first page
- **WHEN** search or a filter matches only nodes later in the unfiltered stable order
- **THEN** the first filtered page includes those matches and its totals describe the full filtered result

### Requirement: Citation Graph neighborhood reads SHALL share page merge semantics
The existing graph slice operation SHALL accept an expected graph hash, current normalized filters, a direction of incoming, outgoing, or both, and bounded node and edge limits. It SHALL return a basis-bound one-hop patch without advancing the sequential window cursor.

#### Scenario: Incoming neighborhood is expanded
- **WHEN** a consumer requests the incoming one-hop neighborhood of a selected node under the current basis
- **THEN** the response includes bounded incoming edges and their endpoints and leaves the page cursor unchanged

### Requirement: Citation Graph pages SHALL use bounded repository queries
Each page SHALL obtain totals through aggregate queries and rows through bounded repository queries with stable node and edge ordering. The runtime SHALL NOT read and project the full graph again for each continuation page. Layout and topic indexes MAY be cached by basis but SHALL NOT become the correctness source of truth.

#### Scenario: A continuation page is requested
- **WHEN** the runtime serves a later page for an unchanged basis
- **THEN** repository reads are bounded to counts, requested rows, endpoint closure, and basis-scoped derived metadata
