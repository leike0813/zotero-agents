# synthesis-persistence-performance Specification

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


Synthesis persistence SHALL keep durable facts exportable through WebDAV while
treating cache/projection/runtime state as local materialization.

#### Scenario: Durable facts are exported

- **WHEN** concepts, topic graph decisions, reviews, discovery decisions,
  reference bindings, tag vocabulary, topic current source assets, or
  related-items durable effects exist
- **THEN** export SHALL render them into deterministic WebDAV durable bundle
  entries.

#### Scenario: Rebuildable projections exist

- **WHEN** cache basis, citation graph cache rows, layout rows, metrics rows, or
  operation rows exist
- **THEN** export SHALL treat them as local projections or runtime state
- **AND** they SHALL NOT be included in WebDAV bundles or canonical asset
  copies.

### Requirement: Import writes durable state through repository APIs


Durable import SHALL write Synthesis facts only through repository/domain
services after preview succeeds.

#### Scenario: Import hydrates clean SQLite

- **WHEN** local SQLite has no durable Synthesis facts and a valid WebDAV durable
  payload is imported
- **THEN** Synthesis SHALL hydrate durable facts through repository/domain APIs
- **AND** rebuildable projections SHALL be marked stale rather than ready.

### Requirement: WebDAV sync excludes rebuildable projections

WebDAV Sync SHALL only upload durable bundle assets and SHALL exclude runtime state, cache, projection, SQLite, WAL, SHM, logs, locks, and temporary files.

#### Scenario: WebDAV export runs

- **WHEN** WebDAV Sync uploads a snapshot
- **THEN** uploaded paths SHALL be limited to `manifest.json` and `bundles/**` under a snapshot root plus the final `HEAD.json`
- **AND** it SHALL exclude `zotero-agents.db`, `synthesis.db`, and their WAL/SHM companion files.

### Requirement: Synthesis runtime state is isolated in its own SQLite database

Synthesis SHALL use `state/synthesis.db` as the local SQLite source for sidecar cache rows, review state, user-approved decisions, and operation progress.

#### Scenario: Repository initializes

- **WHEN** the Synthesis repository initializes for a persistence root
- **THEN** it SHALL open `state/synthesis.db`
- **AND** it SHALL create or migrate Synthesis `synt_*` schema there.

#### Scenario: Legacy same-root Synthesis tables exist

- **WHEN** `state/synthesis.db` has no active Synthesis schema or rows
- **AND** the same root's `state/zotero-agents.db` contains legacy `synt_*` tables
- **THEN** initialization SHALL copy allowlisted Synthesis tables into `state/synthesis.db`
- **AND** it SHALL leave the legacy tables in `state/zotero-agents.db` untouched.

#### Scenario: Legacy migration source is absent

- **WHEN** no legacy `synt_*` tables exist in `state/zotero-agents.db`
- **THEN** initialization SHALL create a clean `state/synthesis.db`.

### Requirement: Topic structured artifact computation SHALL be bounded

Structured artifact engine requests SHALL use explicit limits for nested JSON,
collections, object properties, strings, and total content, and SHALL provide
deterministic traversal checkpoints.

#### Scenario: Stress-tier request remains within policy

- **WHEN** a valid bounded topic artifact is validated or assembled
- **THEN** computation SHALL complete without file, database, network, or Host access
- **AND** progress or cancellation SHALL be observable at checkpoints.

### Requirement: Topic artifact promotion SHALL remain failure-safe

The application SHALL retain ownership of canonical hashes and promotion after
engine results are rebuilt.

#### Scenario: Result validation fails

- **WHEN** an engine result cannot be rebuilt against its request
- **THEN** no canonical topic state or downstream durable side effect SHALL be promoted.

### Requirement: Graph-build canary SHALL remain globally bounded

Graph-build serialization and execution SHALL use the existing compute byte,
JSON-node, queue, worker, deadline, cancellation, resource, and shutdown bounds.

#### Scenario: Graph build saturates the worker
- **WHEN** graph-build work occupies the active slot and waiting queue
- **THEN** health, handshake, cancellation, and shutdown SHALL remain responsive and additional compute SHALL receive immediate backpressure

#### Scenario: Graph build is canceled while active
- **WHEN** cooperative cancellation does not complete within 100ms
- **THEN** the worker SHALL be terminated and replaced within the existing lifecycle policy

### Requirement: Shadow graph work is bounded and transaction-light

Build, layout, and metrics kernels SHALL run through the bounded worker outside SQLite transactions; direct full build admission SHALL enforce 8 MiB, 250,000 request JSON nodes, and 50,000 result JSON nodes without packed fallback; reads SHALL remain bounded and available during compute.

#### Scenario: Oversized graph is rejected before worker admission
- **WHEN** a direct private rebuild exceeds a monolithic admission bound
- **THEN** it returns `invalid_request` without worker execution or repository mutation

### Requirement: Sidecar compute SHALL use bounded volatile resources


The compute canary SHALL use one worker, at most two waiting requests, existing
1 MiB/50k-node wire bounds, fixed V8 resource limits, and no operation
persistence or database queue.

#### Scenario: Compute load exceeds bounded capacity

- **WHEN** callers submit work beyond one active and two waiting tasks
- **THEN** excess work SHALL fail immediately
- **AND** no persistent operation or unbounded in-memory collection SHALL grow.

### Requirement: Sidecar control plane SHALL be independent from worker progress


Health and handshake snapshots SHALL be O(1), and shutdown SHALL not wait for a
layout iteration loop beyond its bounded termination budget.

#### Scenario: Worker is CPU-bound or hung

- **WHEN** the main service thread receives health, handshake, or shutdown
- **THEN** it SHALL respond using incrementally maintained pool state
- **AND** it SHALL NOT request synchronous worker inspection.

### Requirement: Shadow persistence does not change production ownership

The isolated repository SHALL persist only its own foundation metadata and MUST NOT read, mirror, migrate, or mutate production Synthesis rows or canonical files. The plugin SHALL remain the production database and canonical-file owner until a separately approved cutover.

#### Scenario: Foundation canary runs independently
- **WHEN** the service exercises cache-basis and operation CRUD across restart
- **THEN** it does so entirely within the shadow root and production repository behavior and bounds remain unchanged

### Requirement: Graph-build data-path measurements are reproducible

Citation Graph build performance evidence SHALL separate request rebuilding,
serialization, parsing, direct compute, result rebuilding, worker transfer, and
authenticated HTTP admission. Where available it SHALL also record worker CPU,
heap, event-loop utilization, parent RSS/heap, control-plane responsiveness, and
cancellation latency.

#### Scenario: Host-dependent measurements vary
- **WHEN** the benchmark runs on a different supported development host
- **THEN** absolute timing and memory values are recorded as observations while deterministic parity and envelope classifications remain the CI gates

### Requirement: Scale sampling is bounded

Normal, target, and stress sampling SHALL be explicit, isolated, and bounded so
that a failed or exhausted profile cannot leave a sidecar service, worker, or
child process running.

#### Scenario: Profile sampling terminates
- **WHEN** a profile completes, times out, is canceled, crashes, or exhausts its resource budget
- **THEN** all benchmark-owned service, worker, and child-process resources are terminated within the runner's bounded cleanup path

### Requirement: Streaming transfer bounds retained memory and output publication

The transfer owner SHALL retain only page metadata/path state, the worker protocol SHALL permit at most one unacknowledged page per direction, and attempt output SHALL count against existing direction and service byte limits.

#### Scenario: Input pages are staged
- **WHEN** validated pages have been written atomically
- **THEN** the owner SHALL release their row object graphs and later read each page on demand

#### Scenario: Normal profile is executed
- **WHEN** the normal benchmark profile uses streaming transfer
- **THEN** it SHALL complete under the 256 MiB worker old-generation limit and 30-second active deadline without an absolute host-memory assertion

### Requirement: Large graph transfer SHALL have explicit storage and lifetime budgets

Citation Graph Build staging SHALL enforce page, direction, service-session, aggregate-byte, idle-lifetime, absolute-lifetime, and cleanup-interval limits as contracts-owned constants.

#### Scenario: Service is under transfer load
- **WHEN** the service has two active sessions or reaches its staged-byte budget
- **THEN** it rejects additional reservation with a stable bounded error while health, handshake, and shutdown remain responsive

#### Scenario: Cleanup handles a large directory
- **WHEN** cancel, expiry, or shutdown retires staged data
- **THEN** the control path removes addressability by rename and does not synchronously walk the full directory before responding

### Requirement: Transfer validation SHALL avoid whole-graph amplification

The transfer runtime SHALL validate one page at a time and SHALL NOT invoke the complete Citation Graph Build result rebuilder when accepting or returning a page.

#### Scenario: Output page is read
- **WHEN** an authenticated client reads one completed result page
- **THEN** memory and validation work are bounded by that page rather than by the complete graph result

### Requirement: Citation graph complex metrics SHALL use bounded lock sections


Citation Graph complex metrics refresh SHALL hold the per-library write lock only while capturing a consistent graph basis or promoting records against that basis.

#### Scenario: CPU computation is in progress

- **WHEN** PageRank, weak components, or role scoring is running
- **THEN** the per-library write lock SHALL be released
- **AND** unrelated bounded graph maintenance SHALL be able to acquire the lock.

#### Scenario: Computed records are promoted

- **WHEN** a metrics result is ready for persistence
- **THEN** the promotion lock section SHALL only re-read the current graph basis, validate it, and transactionally replace complex metrics when unchanged.

### Requirement: Citation graph readiness SHALL not depend on complex metrics success


Committed Citation Graph structure SHALL remain a readable cache projection when complex metrics computation fails or is superseded.

#### Scenario: Metrics computation fails after graph commit

- **WHEN** a full or incremental graph refresh has committed structure and the metrics engine subsequently fails
- **THEN** graph structure and cache readiness SHALL remain available
- **AND** metrics reads SHALL use the existing stale or missing semantics rather than marking the graph structure unavailable.

### Requirement: Concept KB index engine execution is bounded


Concept KB index and query requests SHALL enforce production collection and
string limits before computation and SHALL expose deterministic cancellation
checkpoints.

#### Scenario: Production bounds are exceeded

- **WHEN** a source or query collection exceeds its configured limit
- **THEN** computation SHALL fail without modifying repository, canonical, or
  projection state.

### Requirement: Concept KB projection promotion is failure-safe


Projection registry state SHALL advance only after the application strictly
rebuilds an engine result for the current manifest basis.

#### Scenario: Result basis is invalid

- **WHEN** an engine result changes manifest hash or rebuild timestamp
- **THEN** the result SHALL be rejected and the previous projection state
  SHALL remain authoritative.

### Requirement: Advanced matcher compute SHALL use bounded lock sections


Advanced Reference Matching SHALL hold the per-library write lock only while capturing or recapturing its durable repository basis and while transactionally promoting validated results.

#### Scenario: Host or engine work is running

- **WHEN** Host library metadata is loading or binding/dedupe computation is executing
- **THEN** the per-library write lock SHALL be released
- **AND** the engine SHALL perform no repository or Host I/O.

### Requirement: Reference matcher requests SHALL be explicitly bounded


Production matcher contracts SHALL enforce stress-tier collection bounds, bounded per-row evidence, bounded candidate output, and fixed cluster block and pair budgets.

#### Scenario: A matcher bound is exceeded

- **WHEN** library papers, binding inputs, dedupe canonicals, evidence arrays, strings, cluster blocks, or candidate pairs exceed policy
- **THEN** computation SHALL fail before durable promotion
- **AND** prior durable matcher decisions SHALL remain readable.

### Requirement: Advanced matcher promotion SHALL be atomic


Validated binding and canonical-dedupe results for one captured basis SHALL be promoted in one repository transaction.

#### Scenario: Matcher transaction fails

- **WHEN** any binding, redirect, proposal, graph-stale, or operation-completion write fails
- **THEN** the transaction SHALL roll back the entire matcher promotion
- **AND** no partial pass result SHALL remain durable.

### Requirement: Tag Vocabulary engine execution is bounded


Synthesis SHALL reject Tag Vocabulary validation or index requests that exceed the engine's production collection and string limits.

#### Scenario: Oversized canonical mutation is attempted

- **WHEN** a canonical Tag mutation would require validation beyond an engine bound
- **THEN** the mutation SHALL fail atomically
- **AND** no Tag Vocabulary repository state SHALL be replaced.

#### Scenario: Explicit index rebuild computes

- **WHEN** a bounded Tag index rebuild runs
- **THEN** repository loading and projection registry writes SHALL remain application-owned
- **AND** engine computation SHALL not perform persistence or Host I/O.

### Requirement: Topic Graph index engine execution is bounded


Topic Graph index requests SHALL enforce production collection and string
limits before computation and SHALL expose deterministic cancellation
checkpoints.

#### Scenario: Production bounds are exceeded

- **WHEN** a source collection exceeds its configured limit
- **THEN** computation SHALL fail without modifying repository, canonical, or
  projection state.

### Requirement: Topic Graph projection promotion is failure-safe


Projection registry state SHALL advance only after the application strictly
rebuilds an engine result for the current manifest basis.

#### Scenario: Result basis is invalid

- **WHEN** an engine result changes manifest hash or rebuild timestamp
- **THEN** the result SHALL be rejected and the previous projection state
  SHALL remain authoritative.

### Requirement: Citation graph build SHALL use bounded lock sections


Citation Graph construction SHALL hold the per-library write lock only while capturing a durable graph-input basis or conditionally promoting records against that basis.

#### Scenario: Host or engine work is in progress

- **WHEN** Zotero metadata is being loaded or graph nodes, edges, aggregates, ownership, incoming groups, or light metrics are being computed
- **THEN** the per-library write lock SHALL be released
- **AND** unrelated bounded maintenance SHALL be able to acquire the lock.

#### Scenario: Computed graph is promoted

- **WHEN** a graph-build result is ready for persistence
- **THEN** the promotion lock section SHALL only recapture the durable basis, compare it, and transactionally replace the intended graph scope when unchanged.

### Requirement: Citation graph build requests SHALL be explicitly bounded


The production graph-build contract SHALL enforce explicit source, reference-instance, and external-target limits and deterministic checkpoints.

#### Scenario: Production stress tier is accepted

- **WHEN** a request stays within 25,000 source nodes, 1,250,000 reference instances, and 750,000 external or unresolved targets
- **THEN** it SHALL remain eligible for deterministic graph assembly.

#### Scenario: A configured bound is exceeded

- **WHEN** a request exceeds any build bound
- **THEN** it SHALL fail before persistence
- **AND** previous graph rows SHALL remain readable.

### Requirement: Maximum compute envelopes retain bounded transient work

The sidecar SHALL combine the 8 MiB envelope with fixed JSON structure limits,
one worker, two queued requests, and existing V8 resource limits.

#### Scenario: Maximum-size compute traffic is active
- **WHEN** a compute request approaches the byte and structure limits
- **THEN** health, handshake, and authenticated shutdown remain responsive without unbounded buffering or queue growth

### Requirement: Overflow terminates collection promptly

The HTTP reader SHALL stop retaining additional body chunks after an abort or
byte-limit violation.

#### Scenario: Upload continues after crossing the limit
- **WHEN** the service has detected that an incoming body is oversized
- **THEN** it releases collected chunks and does not wait for the complete upload before resolving the request

### Requirement: Production compute waits do not hold persistence authority

The plugin SHALL complete graph reads before remote layout computation and SHALL
perform basis validation and promotion after the result without holding a DB
transaction or repository lock across the network/worker wait.

#### Scenario: Worker is saturated or slow
- **WHEN** a production layout waits, fails busy, or reaches its deadline
- **THEN** DB access and sidecar health, handshake, and shutdown remain independently responsive

### Requirement: Production routing remains bounded

The production layout route SHALL inherit the existing wire, queue, worker,
deadline, and resource limits and SHALL add only bounded serialization and IPC
overhead.

#### Scenario: Representative bounded graph is laid out
- **WHEN** a representative engine-valid graph is routed through the sidecar
- **THEN** output remains equivalent to direct engine execution within the documented route budget

### Requirement: Metrics worker wait is bounded and outside DB ownership

Production metrics routing SHALL apply the existing five-second hard deadline and
SHALL NOT retain a production DB transaction or lock while waiting for HTTP,
queue, or worker completion.

#### Scenario: Metrics task waits behind layout
- **WHEN** a metrics task is admitted behind an active layout task
- **THEN** its wait remains bounded by the shared queue and hard deadline without retaining DB ownership

### Requirement: Control plane remains responsive under mixed compute load

Health, handshake, and shutdown SHALL remain responsive while layout or metrics
occupies the worker or waiting queue.

#### Scenario: Worker is saturated
- **WHEN** the shared pool has one active task and two queued tasks
- **THEN** health and handshake return O(1) pool snapshots and shutdown completes within its configured budget
