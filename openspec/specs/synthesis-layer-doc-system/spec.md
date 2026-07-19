# synthesis-layer-doc-system Specification

## Purpose
Synthesis docs describe Zotero Library SSOT, sidecar cache, explicit operations, and destructive hard-cut cleanup.
## Requirements
### Requirement: Active docs hard-cut old synchronization model

Active Synthesis docs and specs SHALL describe Zotero Library SSOT, sidecar cache, explicit operations, and removal of dirty-event/WorkItem/startup-reconcile synchronization.

#### Scenario: Developer reads active docs
- **WHEN** active docs discuss runtime, state machines, events, sequences, rebuild, or maintenance
- **THEN** they SHALL identify dirty events, WorkItems, WorkRuns, startup reconcile, queue drain, and Registry rebuild as removed implementation targets
- **AND** they SHALL NOT describe them as legacy mechanisms that may remain in active implementation.

### Requirement: Active docs define destructive cleanup expectations

Active docs SHALL state that this hard cut permits destructive Synthesis sidecar schema replacement and removal of old runtime tables.

#### Scenario: Implementation plan is reviewed
- **WHEN** a developer prepares implementation tasks
- **THEN** the docs SHALL require removal of old tables, APIs, UI projection, and tests
- **AND** they SHALL reject no-op compatibility shims for the old synchronization model.

### Requirement: Docs describe active sidecar backend semantics

Synthesis layer docs SHALL describe Reference Sidecar refresh and Citation Graph cache rebuild as separate explicit operations.

#### Scenario: Docs mention refresh and graph cache
- **WHEN** active docs describe Reference Sidecar refresh
- **THEN** they SHALL state that refresh updates sidecar rows and may trigger a separate visible graph incremental refresh or mark graph cache stale
- **AND** they SHALL NOT state that refresh synchronously rebuilds graph cache.

#### Scenario: Docs describe readiness
- **WHEN** active docs describe sidecar or graph readiness
- **THEN** they SHALL name cache basis as the data readiness source
- **AND** they SHALL not name legacy sidecar state files, sidecar index files, or graph index files as runtime readiness sources.

### Requirement: Docs distinguish lightweight and advanced reference matching

Active Synthesis docs SHALL describe Reference Sidecar refresh, Advanced Reference Binding, and Advanced External Dedupe as separate algorithms with separate triggers and materialization policy.

#### Scenario: Developer reads matching docs
- **WHEN** docs describe Advanced Reference Matching
- **THEN** they SHALL state that binding and external dedupe are separate passes
- **AND** fuzzy external dedupe SHALL be documented as review-only in this version.

### Requirement: Harness documentation distinguishes benchmark and realtime debugging

Active documentation SHALL distinguish the old fixture/gold-label benchmark
harness from the new realtime Synthesis Index algorithm harness.

#### Scenario: Developer chooses a harness
- **WHEN** a developer wants to inspect current Zotero and plugin database state
  and run cluster dedupe experiments
- **THEN** documentation SHALL direct them to `tools/synthesis-index-harness`.

#### Scenario: Cluster classifier is documented
- **WHEN** active documentation describes contained-title dedupe
- **THEN** it SHALL describe eligibility filtering, structured bibliographic
  suffix classification, semantic extension risk, and the prohibition on using
  an ever-growing venue token list as the primary classifier.

### Requirement: Active Docs SHALL Describe Reference Quality Responsibility Boundaries

Active docs SHALL describe the distinction between skill extraction quality,
workflow apply fallback filtering, and Synthesis sidecar ingestion.

#### Scenario: Developer reads reference quality docs
- **WHEN** active docs describe literature-digest references entering Synthesis
- **THEN** they SHALL state that the skill should own extraction quality
- **AND** workflow apply only removes deterministic bad rows before note writing
- **AND** Synthesis sidecar ingestion only provides a fallback deterministic skip for legacy/imported inputs.

#### Scenario: Developer reads skill upgrade guidance
- **WHEN** active docs or artifacts describe the external literature-digest Stage 4 gate
- **THEN** they SHALL distinguish hard-block defects from soft warning defects
- **AND** they SHALL recommend preserving the existing references array compatibility shape.

### Requirement: Docs define Workbench surface refresh architecture

Active Synthesis documentation SHALL describe Shell, Chrome, and Surface read models as the Workbench UI architecture.

#### Scenario: Developer reads Workbench docs
- **WHEN** a developer reads active Synthesis Workbench documentation
- **THEN** the docs SHALL state that full snapshot reads are debug-only
- **AND** they SHALL define allowed surface invalidation and progress update behavior.

### Requirement: Active Docs SHALL Treat Cluster Dedupe As Production Policy

Active Synthesis docs SHALL describe cluster-first external dedupe as the
production Advanced Reference Matching policy.

#### Scenario: Developer reads active reference-resolution docs
- **WHEN** docs describe Advanced External Dedupe
- **THEN** they SHALL state that production `runAdvancedReferenceMatchingNow`
  uses cluster-first dedupe
- **AND** they SHALL NOT describe production as wired to the old pairwise
  dedupe algorithm.

### Requirement: Docs describe graph incremental and full rebuild modes

Active Synthesis documentation SHALL describe source-slice incremental graph refresh and explicit full graph rebuild as separate maintenance modes.

#### Scenario: Docs no longer say graph cache is only full rebuilt

- **WHEN** readers consult runtime, graph, performance, UI, state-machine, or invariant docs
- **THEN** they SHALL see the incremental refresh trigger rules and bootstrap policy.

### Requirement: Synthesis docs describe related-items sync as graph-optional

Active Synthesis documentation SHALL describe related-items sync as an independent visible operation that may use graph cache as a fast path but can compute accepted library-to-library edges from sidecar facts.

#### Scenario: Docs describe update ordering and independence

- **WHEN** a user reads runtime or citation graph documentation
- **THEN** it SHALL state that related-items sync runs after graph refresh attempts
- **AND** it SHALL state that graph cache success is not a correctness precondition
- **AND** it SHALL state that related-items sync does not rebuild graph cache.

### Requirement: Synthesis layer documentation SHALL describe artifact payload storage truthfully

Active documentation SHALL describe v2 anchored embedded payload storage and the Synthesis artifact availability boundary.

#### Scenario: Documentation mentions artifact availability
- **WHEN** active Synthesis docs describe artifact existence
- **THEN** they SHALL state that parseable embedded payload attachments are the artifact availability source
- **AND** hidden payload blocks or note-only presence are legacy/migration diagnostics only.

### Requirement: Active Synthesis docs SHALL match executable resolver contracts

Active documentation and agent-facing prompt text SHALL describe the same `resolvers.resolve` input shape used by Host Bridge, MCP, and CLI code.

#### Scenario: Docs show resolver wrapper object
- **WHEN** a reader consults CLI, MCP, or Synthesis resolver documentation
- **THEN** examples SHALL show a top-level `resolver` field
- **AND** active docs SHALL NOT present `topic_resolver` as a valid Host Bridge or CLI resolver input.

### Requirement: Docs describe deferred sidecar graph maintenance

Active Synthesis documentation SHALL state that digest apply and Reference Sidecar refresh write sidecar facts and mark graph/related-items sync stale, while graph refresh is an explicit follow-up maintenance action.

#### Scenario: Docs describe sidecar update ordering

- **WHEN** readers consult runtime, graph, UI, or contract documentation
- **THEN** they SHALL see that digest apply and Reference Sidecar refresh do not automatically run graph incremental refresh
- **AND** they SHALL see that related-items sync is deferred until successful manual stale graph refresh or explicit sync.

### Requirement: Docs describe scoped post-refresh related-items sync

Active Synthesis documentation SHALL state that manual stale graph refresh may run scoped related-items sync after graph refresh succeeds.

#### Scenario: Docs describe graph refresh follow-up

- **WHEN** readers consult graph or related-items documentation
- **THEN** they SHALL see that post-refresh related-items sync uses the final affected source refs
- **AND** full graph rebuild SHALL NOT be described as automatically running full-library related-items sync.

### Requirement: Synthesis docs describe WebDAV durable bundle sync

Active Synthesis documentation SHALL describe WebDAV Sync as the only durable
bundle transport and SHALL contain no Git Sync history, compatibility, or
retirement narrative.

#### Scenario: Developer reads WebDAV sync docs

- **WHEN** docs discuss durable synchronization
- **THEN** they SHALL state that Preferences and Synthesis Home expose WebDAV
  Sync
- **AND** they SHALL describe canonical autosync, bounded retry, conflict gates,
  and lifecycle cancellation as WebDAV current state only.

### Requirement: Documentation SHALL describe the Topic Structured Artifact engine boundary

Current-state Synthesis documentation SHALL identify structured artifact
validation, assembly, and patch computation as engine-owned and identify
workspace IO, Host checks, hashing, canonical promotion, and downstream effects
as application-owned.

#### Scenario: Engineer reads the architecture documentation

- **WHEN** an engineer reviews Synthesis engine and topic lifecycle documentation
- **THEN** the documented dependency direction, failure behavior, bounds, and production topology SHALL match the implemented current state.

### Requirement: Current docs SHALL distinguish canary from production routing

Synthesis documentation SHALL state that graph build has an authenticated
internal worker canary while production graph build remains in process and
production-scale transfer is deferred.

#### Scenario: Runtime documentation is reviewed
- **WHEN** maintainers read runtime, packaging, performance, Citation Graph, README, and Stage 1 progress documentation
- **THEN** they SHALL find the three-operation pool, unchanged wire limits, unchanged production authority, and separate prebuild release gate described consistently

### Requirement: Documentation distinguishes private graph shadow from production ownership

Current-state Synthesis documentation SHALL describe the isolated Citation Graph application, commit and warning semantics, worker/admission bounds, lifecycle ordering, and absent RPC/automatic invocation while identifying plugin composition as production graph repository, basis, promotion, and client owner.

#### Scenario: Operators do not infer production cutover
- **WHEN** runtime, persistence, performance, packaging, registry, README, and Stage 1 documentation are read together
- **THEN** each surface consistently distinguishes the private shadow application from production routes and WS7 ownership

### Requirement: Current Synthesis docs SHALL describe the compute canary topology

Runtime, packaging, performance, README, and Stage 1 documentation SHALL state
that the supervised service owns a lazy bounded layout worker canary while
production DB, canonical files, engine composition, and client routing remain
in-process.

#### Scenario: Engineer reads active sidecar documentation

- **WHEN** active docs describe sidecar compute
- **THEN** they SHALL distinguish control-plane availability, worker-pool state,
  and production kernel ownership
- **AND** they SHALL not claim that production layout has migrated.

#### Scenario: Engineer reviews steady-state cost

- **WHEN** active performance docs describe the supervisor and compute pool
- **THEN** they SHALL state that the supervisor has low steady-state overhead
- **AND** the worker is created lazily and bounded.

### Requirement: Current-state documentation records WS5 closure

Synthesis README, runtime, persistence, maintenance/debug, migration inventory, and Stage 1 plan SHALL describe the implemented private foundation and all six passed WS5 exit gates, with WS6 shadow parity identified as the next stage.

#### Scenario: Maintainers review the Stage 1 status
- **WHEN** maintainers read active Synthesis documentation after the executable gates pass
- **THEN** WS5 SHALL be marked complete, WS6 SHALL be next, and WS6 parity or WS7 cutover SHALL NOT be described as already implemented

### Requirement: Documentation distinguishes foundation from cutover

Synthesis runtime, persistence, performance, packaging, supervision, README, and Stage 1 documentation SHALL describe the persistent isolated three-table repository as WS5 infrastructure and SHALL identify WS6 shadow parity and WS7 atomic single-writer cutover as future work.

#### Scenario: Reader cannot mistake shadow writes for production ownership
- **WHEN** a maintainer reads the Synthesis architecture and progress documents
- **THEN** the documents state that production database, canonical files, engines, and public client routing remain plugin-owned

### Requirement: Documentation distinguishes runtime foundation from production service

Active Synthesis documentation SHALL describe the independent Node service
foundation as development/test-only until packaging, plugin launch, remote
client routing, and production ownership are implemented.

#### Scenario: Developer reads runtime documentation

- **WHEN** current-state docs describe the Node service foundation
- **THEN** they SHALL state that it provides only loopback health, handshake,
  authorization, and lifecycle behavior
- **AND** they SHALL state that production remains on the in-process client and
  plugin-owned storage.

### Requirement: Documentation distinguishes isolated application from production ownership

Current-state Synthesis documentation SHALL describe the shadow Topic application, canonical commit point, post-commit warnings, retired Topic mirror, and deferred remote routing/single-writer cutover without presenting the shadow as production authority.

#### Scenario: Documentation remains current-state only
- **WHEN** operators inspect persistence, runtime, performance, packaging, and Stage 1 documentation
- **THEN** each surface consistently identifies isolated roots and unchanged production owners

### Requirement: Docs describe the operational chrome WS5 slice

Active Synthesis documentation SHALL describe the environment-neutral application package and authenticated `workbench.chrome.read` canary as an operational shadow read model over cache-basis and operation rows.

#### Scenario: Developer reviews WS5 progress

- **WHEN** documentation discusses Workbench chrome or sidecar persistence
- **THEN** it SHALL state that production Workbench routing, database ownership, canonical files, storage, sync, and review state remain plugin-owned
- **AND** it SHALL identify WS6 parity and WS7 single-writer cutover as later work.

### Requirement: Active documentation distinguishes the WS5 milestone from Stage 1 completion

Active Synthesis planning and current-state documentation SHALL use the exact
name `Stage 1 / WS5 — Private Isolated Synthesis Foundation Complete` whenever
it reports the Stage 1/WS5 milestone, and SHALL distinguish that milestone from
WS6 shadow verification, WS7 production cutover, complete Stage 1 delivery,
and real-machine acceptance.

#### Scenario: Maintainer reviews current Stage 1 status

- **WHEN** a maintainer reads an active Synthesis status or migration plan
- **THEN** the completed scope SHALL be limited to the private isolated
  application, repository, canonical, and maintenance foundations
- **AND** the documentation SHALL NOT describe Stage 1, production cutover, or
  real-machine acceptance as complete

#### Scenario: Maintainer locates remaining remote and production work

- **WHEN** a maintainer reviews the WS6 and WS7 workstreams
- **THEN** WS6 SHALL own representative remote client/routes, bounded process
  events, Host-port canaries, and shadow parity without production writes
- **AND** WS7 SHALL own complete production consumer routing and the atomic
  single-writer cutover

#### Scenario: Maintainer reviews Host boundary ownership

- **WHEN** active planning describes WebDAV credentials or remote export
  delivery
- **THEN** credentials and prefs SHALL remain owned by the plugin WebDAV Host
  adapter behind a secret-free application port
- **AND** export applications SHALL provide bounded canonical entries through
  `SynthesisHostExportDeliveryPort` while the plugin Host adapter owns
  ephemeral materialization, registration, delivery, and cleanup
- **AND** the plan SHALL NOT require a service-owned secret store or export
  asset registry

### Requirement: Benchmark status and interpretation are documented

Active Synthesis documentation SHALL identify the benchmark command, stable CI
gate, captured host-dependent baseline, current monolithic wire failure, and the
deferred large-transfer prerequisite. Documentation SHALL NOT imply that graph
build is a production worker route or that target/stress budgets are met.

#### Scenario: Reader reviews implementation status
- **WHEN** a reader opens the Synthesis runtime, performance, or status documentation
- **THEN** they can distinguish small canary parity, representative wire ineligibility, report-only measurements, and the remaining production transfer work

### Requirement: Active documentation distinguishes streaming canary from production cutover

Synthesis runtime, packaging, performance, sequence, README, migration, and Stage 1 documentation SHALL describe the packed streaming worker, exact bounds, normal-scale evidence, and unchanged production route.

#### Scenario: A maintainer reviews migration status
- **WHEN** active documentation is read
- **THEN** it SHALL state that transfer execution is explicit/internal and that basis recapture plus repository promotion remain prerequisites for a separate production cutover

### Requirement: Synthesis docs SHALL describe large-transfer staging truthfully

Active documentation SHALL distinguish the authenticated JSON-page staging canary from packed worker execution and production graph-build routing.

#### Scenario: Runtime documentation is read
- **WHEN** a maintainer reviews Synthesis runtime, packaging, performance, README, and Stage 1 progress documentation
- **THEN** it states the exact transfer limits and ownership boundary, records that the compute worker remains unconnected, and identifies packed worker integration as the next change

#### Scenario: Migration documentation is read
- **WHEN** a maintainer inspects the service API migration inventory
- **THEN** Citation Graph Build is marked as a transfer/worker canary but remains `production_worker: false`

### Requirement: Documentation SHALL describe the Concept KB index engine boundary

Active Synthesis documentation SHALL describe Concept KB search, overlay, and
bounded exact-query computation as an environment-neutral engine while
repository, canonical, review, mutation, and public compatibility ownership
remain application-side.

#### Scenario: Current architecture is documented

- **WHEN** active docs describe Concept KB runtime ownership
- **THEN** they SHALL identify `synthesis-engine` as the index/query algorithm owner
- **AND** SHALL NOT claim that proposal matching or production sidecar execution
  has moved.

### Requirement: Active docs SHALL describe the matcher engine boundary

Active Synthesis documentation SHALL describe Advanced Reference Binding and Advanced External Dedupe as process-portable engine contracts orchestrated by the application layer.

#### Scenario: Developer reads matcher documentation

- **WHEN** active docs describe Reference Matcher implementation
- **THEN** they SHALL identify `synthesis-engine` as the algorithm owner
- **AND** they SHALL identify Host reads, repository capture, proposal/fact materialization, user decisions, and graph follow-up as application responsibilities.

### Requirement: Documentation SHALL describe the Tag Vocabulary engine boundary

Active Synthesis documentation SHALL describe TagVocab validation and index construction as process-portable engine contracts orchestrated by the application layer.

#### Scenario: Developer reads Tag Vocabulary documentation

- **WHEN** active docs describe Tag Vocabulary implementation
- **THEN** they SHALL identify `synthesis-engine` as the validation and index algorithm owner
- **AND** they SHALL identify SQLite, transactions, manifests, import merge policy, diagnostics, staged suggestions, Host effects, progress, and autosync as application responsibilities.

### Requirement: Documentation SHALL describe the Topic Graph index engine boundary

Active Synthesis documentation SHALL describe root and unplaced-topic index
derivation as an environment-neutral engine while repository, canonical,
review, mutation, UI filtering, and projection compatibility ownership remain
application-side.

#### Scenario: Current architecture is documented

- **WHEN** active docs describe Topic Graph runtime ownership
- **THEN** they SHALL identify `synthesis-engine` as the index algorithm owner
- **AND** SHALL NOT claim that proposal/review logic or production sidecar
  execution has moved.

### Requirement: Documentation distinguishes wire capacity from production routing

Current-state Synthesis documentation SHALL describe the 8 MiB compute
envelope, unchanged engine bounds, and unchanged in-process production owner.

#### Scenario: Reader evaluates sidecar readiness
- **WHEN** a maintainer reads runtime, performance, packaging, README, and Stage 1 progress documentation
- **THEN** the maintainer can distinguish transport-capacity readiness from a completed production layout cutover

### Requirement: Documentation distinguishes packaging from runtime activation

Current-state Synthesis documentation SHALL describe the product-owned runtime
bundle and installer without claiming that the plugin launches, supervises, or
routes production requests to the service.

#### Scenario: Reader reviews the runtime topology

- **WHEN** a reader opens the Synthesis architecture and runtime documents
- **THEN** they SHALL see the supported platform matrix, verified installation
  boundary, and rollback behavior
- **AND** production ownership SHALL still be documented as in-process until a
  later cutover.

### Requirement: Documentation describes the current production compute topology

Current-state Synthesis documentation SHALL state that Citation Graph layout
compute runs in the sidecar worker while the plugin owns DB reads, basis checks,
promotion, canonical files, and all other production engines.

#### Scenario: Runtime and progress docs are reviewed
- **WHEN** a maintainer reads runtime, supervision, packaging, performance, README, and Stage 1 documents
- **THEN** the one-kernel route, immediate fail-closed readiness, no-fallback policy, and unchanged public API are explicit

#### Scenario: Release documentation is reviewed
- **WHEN** source routing lands before refreshed platform prebuilds
- **THEN** documentation states that release remains blocked until the separate prebuild pipeline produces the current fingerprint

### Requirement: Documentation reflects two production compute routes

The Synthesis documentation SHALL describe layout and metrics as sidecar worker
routes and the remaining six engines as in-process routes across runtime,
supervision, packaging, performance, README, and Stage 1 guidance.

#### Scenario: Documentation governance runs
- **WHEN** help and architecture documentation checks execute
- **THEN** the documented topology, ownership boundary, no-fallback policy, and separate prebuild release gate match the implementation

### Requirement: Active documentation describes supervised current state

Synthesis architecture documentation SHALL describe the sidecar as
product-owned, launched, supervised, mutation-disabled, and disconnected from
production data and clients.

#### Scenario: Runtime documentation is read
- **WHEN** developers inspect current Synthesis runtime topology
- **THEN** documentation SHALL distinguish runtime-instance ownership from
  future production data ownership
- **AND** it SHALL document the event-driven, low-frequency supervision budget.

### Requirement: Active docs describe the Rust sidecar pivot consistently

Active Synthesis documentation SHALL identify Rust as the approved external sidecar implementation target, the current Node service as a frozen migration oracle, and Rust parity/cutover as the work that replaces the previous Node WS6/WS7 sequence.

#### Scenario: Developer reads the Synthesis roadmap

- **WHEN** an active plan, architecture document, runtime document, or implementation-status table describes the next sidecar stage
- **THEN** it SHALL direct new process implementation work to Rust
- **AND** it SHALL NOT describe Node shadow verification, Node production cutover, a universal Node-runtime XPI, or post-install Node download as the active target.

### Requirement: Historical Node findings remain distinguishable from the approved target

Historical baseline and self-review facts SHALL remain auditable while current planning artifacts clearly record the later Rust pivot.

#### Scenario: A historical WS5 report is updated

- **WHEN** the report predates the Rust decision
- **THEN** its original findings SHALL remain intact
- **AND** a dated follow-up SHALL state which recommendations were superseded rather than rewriting the original evidence as if Rust had already been the plan.

### Requirement: Active documentation reports cross-language migration state precisely

Active Synthesis documentation SHALL identify the cross-language contract and canonical-semantics milestone as Rust migration R1, state whether a Rust executable exists, and name the next approved migration slice.

#### Scenario: R1 documentation is read after completion

- **WHEN** a maintainer consults the migration plan or Synthesis status documentation
- **THEN** it SHALL state that the v1 contract/corpus oracle is frozen
- **AND** no Rust executable or production ownership change exists
- **AND** the next change is the Citation Graph Metrics vertical slice.
