## Purpose

Synthesis persistence is optimized for sidecar cache reads, explicit decision writes, and explicit operation progress.
## Requirements
### Requirement: Sidecar schema is cache and decision oriented

Synthesis persistence SHALL optimize sidecar projection reads, explicit decision writes, and explicit operation progress rather than queue claiming or worker scheduling.

#### Scenario: Repository initializes after hard cut
- **WHEN** the repository initializes
- **THEN** it SHALL create sidecar cache, decision, and operation tables
- **AND** it MAY drop old queue, job, WorkItem, WorkRun, and Registry rebuild tables.

### Requirement: Explicit operations are bounded

Explicit cache refresh and review operations SHALL use bounded reads, bounded writes, and progress checkpoints.

#### Scenario: Operation reaches slice budget
- **WHEN** an operation reaches its configured time or count budget
- **THEN** it SHALL store progress and return control to the caller
- **AND** it SHALL NOT block Zotero UI waiting for a global drain to finish.

### Requirement: Reference refresh and graph rebuild have separate budgets

Reference Sidecar refresh and Citation Graph cache rebuild SHALL be measured as separate explicit operations.

#### Scenario: Reference refresh reports progress
- **WHEN** Reference Sidecar refresh runs
- **THEN** progress SHALL report scanned artifacts or sources, changed references artifacts, extracted raw references, canonicalized references, and binding updates where known.

#### Scenario: Graph cache rebuild reports progress
- **WHEN** Citation Graph cache rebuild runs
- **THEN** progress SHALL report graph input loading, effective canonical resolution, binding target application, node and edge generation, metrics generation, and cache commit.

### Requirement: Advanced matching is budgeted separately from refresh

Advanced reference matching SHALL have a separate performance budget from Reference Sidecar refresh.

#### Scenario: Fuzzy dedupe runs
- **WHEN** fuzzy canonical dedupe runs
- **THEN** it SHALL use bounded blocking keys and operation-level pair budgets
- **AND** it SHALL NOT perform a global all-canonical N² title-similarity scan.

#### Scenario: Fuzzy budget is exceeded
- **WHEN** a fuzzy block or operation exceeds its budget
- **THEN** Synthesis SHALL record diagnostics and skip excess comparisons instead of widening the scan.

### Requirement: Harness writes only isolated debug persistence

The Synthesis Index harness SHALL write algorithm run output only to an
explicit debug SQLite database.

#### Scenario: Debug database path overlaps real databases
- **WHEN** the requested debug database path equals the Zotero database path or
  the plugin database path
- **THEN** the harness SHALL reject the command before running algorithm work.

#### Scenario: Cluster run completes
- **WHEN** a cluster dedupe run completes
- **THEN** the real Zotero and plugin databases SHALL remain unmodified
- **AND** the debug database SHALL contain the run metadata, clusters, edges,
  actions, counters, and diagnostics.

#### Scenario: Low-quality canonical records are filtered
- **WHEN** a cluster run encounters excluded canonical records
- **THEN** those records SHALL be reported through counters or diagnostics
- **AND** they SHALL NOT expand candidate blocks or pair comparisons.

### Requirement: Workbench reads are bounded by surface

Synthesis Workbench read paths SHALL avoid loading unrelated domain data for a surface.

#### Scenario: Graph surface is loaded
- **WHEN** the Graph surface is requested
- **THEN** the service SHALL read graph cache and layout state only
- **AND** it SHALL NOT scan Index rows, Reference Sidecar rows, Tags, or Concepts.

#### Scenario: Review surface is loaded
- **WHEN** the Review surface is requested
- **THEN** the service SHALL read only the active Review tab's bounded review/proposal page and required readable context
- **AND** it SHALL apply status/kind/confidence filters before loading readable context
- **AND** proposal context SHALL be resolved from summary item reads and bounded raw-reference ids
- **AND** it SHALL NOT route through the Index sidecar row builder
- **AND** it SHALL NOT load graph nodes, tag vocabulary, or concept rows.

#### Scenario: Index surface is loaded
- **WHEN** the Index surface is requested
- **THEN** the service SHALL read a bounded Zotero parent-item page
- **AND** it SHALL join sidecar rows only for the current page's source refs
- **AND** default Index library rows SHALL expose reference counts instead of full raw-reference arrays
- **AND** referenced-only mode SHALL use a bounded raw-reference page
- **AND** it SHALL NOT load the Review Center proposal page.

#### Scenario: Zotero item notification invalidates UI cache
- **WHEN** a Zotero item notification reaches the Synthesis Workbench host
- **THEN** the notifier path SHALL only mark affected surface read models dirty and debounce a visible-surface reload
- **AND** it SHALL NOT scan the full Zotero Library
- **AND** it SHALL NOT construct a full Workbench snapshot or invoke Reference Sidecar refresh.

### Requirement: Warmup yields between phases

Synthesis Workbench warmup SHALL yield control between read-model phases.

#### Scenario: Warmup phase completes
- **WHEN** a warmup phase completes or fails
- **THEN** the warmup runner SHALL yield to the event loop before starting the next phase.

### Requirement: Production Cluster Dedupe SHALL Remain Bounded

Production cluster external dedupe SHALL use bounded blocking and pair budgets.

#### Scenario: Candidate blocks exceed budget
- **WHEN** cluster dedupe block size or pair budget is exceeded
- **THEN** production advanced matching SHALL record diagnostics
- **AND** it SHALL NOT widen to a global all-canonical pair scan.

### Requirement: Full related-items sync is batched and bounded by accepted edges

Full related-items sync SHALL process accepted library-to-library citation edges in batches and yield between batches. It SHALL avoid per-edge full graph hash recomputation and SHALL cache binding lookups within a sync run.

#### Scenario: Full sync processes many edges

- **WHEN** full related-items sync runs over many accepted edges
- **THEN** it SHALL report progress through its own operation
- **AND** it SHALL yield control between batches
- **AND** it SHALL NOT recompute the entire graph state for every edge.

### Requirement: Synthesis Workbench surface reads are bounded

Workbench surface reads SHALL avoid broad recomputation for hot UI paths.

#### Scenario: Review target candidates are read-model based

- **WHEN** Review or Index surfaces include Reference Matching target candidates
- **THEN** the service SHALL build candidates from existing library and canonical
  read models
- **AND** it SHALL NOT run advanced reference matching
- **AND** it SHALL NOT rebuild reference sidecar, graph, tag, or concept indexes.

### Requirement: Stale canonical governance SHALL avoid broad matcher work

Stale canonical lifecycle reconciliation SHALL run only for canonical ids affected by the current sourceRef artifact refresh and SHALL NOT run Advanced Matching or full-library fuzzy matching.

#### Scenario: Harness readonly safety

- **WHEN** the UI harness receives a Canonical Revision accept or reject action
- **THEN** it SHALL mock the action as readonly with blocked reason `db-write`
- **AND** SHALL NOT mutate the plugin database.

### Requirement: SQLite busy read failures SHALL be classified as transient for UI refresh

Synthesis Workbench refresh paths SHALL classify SQLite busy-style read failures
as transient UI refresh errors.

#### Scenario: Wrapped repository error has busy cause

- **WHEN** a repository or plugin state store error wraps `NS_ERROR_STORAGE_BUSY`,
  `SQLITE_BUSY`, `database is locked`, or an equivalent storage-busy marker
- **THEN** Workbench surface refresh handling SHALL classify the error as
  transient
- **AND** it SHALL NOT treat the error as a successful empty read.

#### Scenario: Busy handling policy remains unchanged

- **WHEN** this classification is added
- **THEN** it SHALL NOT change WAL mode, SQLite busy timeout, retry attempts, or
  write lock strategy.

### Requirement: Synthesis durable facts and rebuildable projections are separated

Synthesis persistence SHALL keep durable facts exportable while treating cache/projection/runtime state as local materialization.

#### Scenario: Durable facts are exported

- **WHEN** concepts, topic graph decisions, reviews, discovery decisions, reference bindings, tag vocabulary, topic current source assets, or related-items durable effects exist
- **THEN** export SHALL render them into deterministic Git Sync bundle entries.

#### Scenario: Rebuildable projections exist

- **WHEN** cache basis, citation graph cache rows, layout rows, metrics rows, or operation rows exist
- **THEN** export SHALL treat them as local projections or runtime state
- **AND** they SHALL NOT be included in Git Sync bundles or legacy canonical asset copies.

### Requirement: Import writes durable state through repository APIs

Durable import SHALL write Synthesis facts only through repository/domain services after preview succeeds.

#### Scenario: Import hydrates clean SQLite

- **WHEN** local SQLite has no durable Synthesis facts and a valid Git durable payload is imported
- **THEN** Synthesis SHALL hydrate durable facts through repository/domain APIs
- **AND** rebuildable projections SHALL be marked stale rather than ready.

### Requirement: WebDAV sync excludes rebuildable projections

WebDAV Sync SHALL only upload durable bundle assets and SHALL exclude runtime state, cache, projection, SQLite, WAL, SHM, logs, locks, and temporary files.

#### Scenario: WebDAV export runs
- **WHEN** WebDAV Sync uploads a snapshot
- **THEN** uploaded paths SHALL be limited to `manifest.json` and `bundles/**` under a snapshot root plus the final `HEAD.json`.
