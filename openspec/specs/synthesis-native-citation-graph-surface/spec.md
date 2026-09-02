# synthesis-native-citation-graph-surface Specification

## Purpose
Defines the native Citation Graph surface: the public operation matrix, command decoding, coherent public projection, persisted layout format, bounded typed ports, retry, per-operation readiness, and basis-bound read/window/cursor/filter/neighborhood semantics for the Rust Citation Graph surface.

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

#### Scenario: Layout input exceeds the default projection bounds
- **WHEN** durable graph state contains more than 20,000 default-visible nodes or 80,000 endpoint-closed edges
- **THEN** Rust selects library nodes before shared external nodes with stable ID ordering and excludes hover-only external nodes
- **AND** the bounded worker DTO and public default read projection use the same selected node and edge set.

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

### Requirement: Native Citation Graph surfaces SHALL consume application projections

Native Graph page, continuation, neighborhood, metrics, and layout routes SHALL obtain their graph content from the typed Citation Graph application read interface. Runtime adapters SHALL validate and encode wire DTOs without independently assembling graph state from repository records.

#### Scenario: A graph commit races with a surface read
- **WHEN** a Graph surface read overlaps an atomic graph promotion
- **THEN** the response contains graph rows, counts, metrics identity, layout identity, and cache status from one coherent basis
- **AND** it preserves the existing bounded payload, stable cursor, and endpoint-closure behavior

#### Scenario: Runtime translates an application read failure
- **WHEN** the application reports an invalid request, basis mismatch, unavailable projection, or storage failure
- **THEN** the runtime maps the typed outcome to the existing wire-compatible error
- **AND** it does not retry through a direct repository read

### Requirement: Default Citation Graph visibility SHALL use distinct library-source degree

The default Citation Graph SHALL contain library nodes and external nodes cited by more than one distinct eligible library source. Multiple references or mentions from one library source count once. External nodes cited by exactly one source SHALL remain outside the default graph and MAY appear only in a bounded ephemeral hover neighborhood.

#### Scenario: One source repeats the same external citation
- **WHEN** one library source contains multiple references or mentions resolving to one external node
- **THEN** that external node has incoming degree one and is absent from the default node page
- **AND** it remains available through the source node's hover neighborhood

#### Scenario: A second source cites the external node
- **WHEN** a second distinct library source resolves to the same external node
- **THEN** the external node enters the default projection
- **AND** its endpoint-closed citation edges are eligible for layout

### Requirement: Public pages and layout SHALL share one bounded projection

The default public graph pages and Citation layout SHALL consume one basis-bound projection with library-first stable ordering, a 20,000-node cap, an 80,000-edge cap, and endpoint closure. Cursor traversal MUST NOT admit nodes outside that projection, and view filters may only remove projected nodes or edges.

#### Scenario: A bounded projection is paged and laid out
- **WHEN** all public pages for one basis are drained and layout is computed for that basis
- **THEN** the page union and layout node/edge identity sets are equal
- **AND** a node excluded by the projection cap or degree policy cannot appear through a later cursor

### Requirement: Citation Graph rebuild completion SHALL refresh the visible graph

After an asynchronous rebuild commits a new graph basis or layout, the Workbench SHALL perform a bounded refresh of the active graph surface. A transient busy result MAY be retried within the existing operation lifecycle, but a second user rebuild action SHALL NOT be required.

#### Scenario: The first rebuild completes asynchronously

- **WHEN** the rebuild operation transitions from accepted/running to a committed ready result
- **THEN** the active Workbench graph reloads the new graph basis and layout
- **AND** the user sees the result without clicking rebuild again.

#### Scenario: A graph refresh races a busy application

- **WHEN** the first post-terminal read observes a transient graph-application-busy state
- **THEN** the Workbench performs a finite follow-up refresh using the existing bounded scheduling model
- **AND** it eventually shows either the ready graph or a stable diagnostic.

#### Scenario: A layout-only update is committed

- **WHEN** the graph model identity is unchanged but the layout identity changes
- **THEN** the visible nodes use coordinates from the new layout basis
- **AND** stale or compact initial coordinates are not retained merely because graph rows are unchanged.
