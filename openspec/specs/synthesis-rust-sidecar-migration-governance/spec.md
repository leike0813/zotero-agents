# synthesis-rust-sidecar-migration-governance Specification

## Purpose
TBD - created by archiving change pivot-synthesis-sidecar-runtime-to-rust. Update Purpose after archive.
## Requirements
### Requirement: Node sidecar development is frozen during Rust migration

The project SHALL treat the current Node sidecar as a migration oracle only and SHALL NOT add new Node-only capabilities, move production ownership to Node, publish a formal Node-runtime XPI, or introduce post-install Node download.

#### Scenario: New Synthesis sidecar work is planned

- **WHEN** a change would extend the external Synthesis process or advance WS6/WS7
- **THEN** its implementation target SHALL be Rust
- **AND** the Node implementation MAY participate only as a test oracle until the corresponding Rust behavior is accepted.

### Requirement: Cross-language contracts precede Rust domain migration

The project SHALL define versioned language-neutral schemas and canonical positive/negative corpora for every process-boundary DTO before Rust becomes authoritative for that DTO.

#### Scenario: Rust parses or emits a sidecar document

- **WHEN** a Rust migration slice introduces a request, response, launch, discovery, lifecycle, transfer, canonical, or runtime-manifest document
- **THEN** TypeScript and Rust SHALL validate the same schema and gold corpus
- **AND** canonical JSON bytes and hashes SHALL match for all compatibility-preserving documents.

### Requirement: Rust migration uses one active implementation without runtime fallback

Each accepted capability SHALL have exactly one active production implementation, and Node/Rust dual execution SHALL be limited to tests.

#### Scenario: A Rust capability becomes active

- **WHEN** a migrated capability passes its parity and failure gates
- **THEN** the active route SHALL use Rust without per-request Node fallback
- **AND** the superseded TypeScript compute implementation SHALL be removed in that change or an immediately coupled deletion change.

### Requirement: Node and Rust never share mutable ownership

Node and Rust migration candidates SHALL NOT concurrently own the same database, canonical root, owner record, lease, operation, or write authority.

#### Scenario: Repository or canonical parity is tested

- **WHEN** Node and Rust results are compared
- **THEN** each implementation SHALL use an independent identity-bound shadow root
- **AND** production ownership SHALL remain unchanged until the atomic Rust cutover.

### Requirement: CPU isolation survives the runtime-language pivot

The Rust sidecar SHALL execute bounded CPU kernels in a replaceable process boundary with bounded admission, deadlines, cancellation, crash accounting, and degraded-state behavior.

#### Scenario: A Rust kernel hangs or crashes

- **WHEN** the worker fails to complete within its deadline or exits unexpectedly
- **THEN** the control process SHALL terminate or replace the worker without falling back to Node
- **AND** it SHALL preserve the last-good result and expose a bounded structured failure.

### Requirement: Durable Rust state remains production-compatible

Rust repository and canonical implementations SHALL preserve current database, transaction, canonical byte/hash, atomic promotion, journal, recovery, and single-writer semantics unless a separate data migration change explicitly versions them.

#### Scenario: Rust durable parity is evaluated

- **WHEN** the Rust candidate processes existing compatible shadow data or fault-injection fixtures
- **THEN** it SHALL produce compatible rows, canonical bytes, hashes, receipts, and recovery outcomes
- **AND** all five supported targets SHALL pass the required persistence fault matrix before cutover.

### Requirement: Force layout migration is explicitly versioned

The Rust force-layout implementation SHALL use a new layout version rather than claiming exact d3-force compatibility.

#### Scenario: A cached v1 force layout meets the Rust engine

- **WHEN** the Rust layout v2 engine evaluates the cache
- **THEN** the v1 result SHALL be treated as stale and rebuildable
- **AND** no canonical user data SHALL be rewritten merely to preserve old coordinates.

### Requirement: Native runtime packaging meets hard size and provenance gates

The native sidecar SHALL package one executable per supported target with no Node, npm, JavaScript entrypoint, system-runtime discovery, or post-install runtime download.

#### Scenario: Native prebuilds are accepted for XPI assembly

- **WHEN** the five target bundles are built and signed
- **THEN** each compressed runtime SHALL be at most 15 MiB
- **AND** the five runtimes together SHALL be at most 75 MiB
- **AND** the final XPI SHALL be at most 100 MiB
- **AND** each bundle SHALL carry immutable build, lockfile, target, signature, and per-file hash provenance.

### Requirement: Native cutover removes the Node runtime

The Rust production cutover SHALL be atomic and SHALL include deletion of the Node service, Node runtime packaging, JavaScript worker runtime, and obsolete D3 runtime assets.

#### Scenario: Rust cutover is declared complete

- **WHEN** the plugin launches the native manifest v2 bundle in production
- **THEN** no Node binary, Node service entrypoint, runtime D3 package, or Node fallback SHALL remain in the XPI or launch path
- **AND** rollback SHALL select only a compatible prior Rust bundle.

### Requirement: Rust implementation work remains split into reviewable changes

The migration SHALL proceed through independently validated OpenSpec changes rather than one repository-wide translation change.

#### Scenario: A migration workstream begins

- **WHEN** a developer starts canonical contracts, a kernel group, layout v2, durable parity, native packaging, or final cutover
- **THEN** that workstream SHALL have its own behavior-level tasks and exit gates
- **AND** it SHALL identify the superseded Node code that becomes deletable.

### Requirement: R5 SHALL end with one private complex-kernel implementation

After R5 acceptance, matcher, Topic Structured Artifact, Citation Graph Build, and graph transfer private routes SHALL use Rust exclusively; their Node compute branches SHALL be deleted while plugin TypeScript engines remain until final cutover.

#### Scenario: R5 completion is audited

- **WHEN** local gates and all five native target smokes pass
- **THEN** R5 tasks MAY be declared complete and ready to archive
- **AND** the change SHALL NOT claim R6 layout, R7 durable parity, R8 packaging cutover, or R9 production cutover completion.

### Requirement: R5 native candidates SHALL pass five-target acceptance

Windows x64, macOS x64/arm64, and Linux x64/arm64 candidates SHALL smoke all fourteen operations, carry audited fixed dependencies and provenance, remain below 15 MiB each, and remain below 75 MiB in aggregate.

#### Scenario: Remote matrix completes

- **WHEN** the Rust candidate workflow finishes for the R5 commit
- **THEN** all five target smokes and size gates SHALL succeed before final task completion.

### Requirement: R6 SHALL complete layout kernel migration without advancing later stages

R6 SHALL move Citation Graph layout to Rust v2, remove the production Node/D3 compute path, and leave durable repository/application parity, native manifest v2, final cutover, and Node HTTP service deletion to R7–R9.

#### Scenario: R6 completion is assessed

- **WHEN** local contract, quality, resource, build, packaging, and five-target evidence is accepted
- **THEN** no production Node compute kernel or D3 runtime SHALL remain
- **AND** plugin DB, canonical, Host, promotion, and public client ownership SHALL remain unchanged.

#### Scenario: A later-stage concern is encountered

- **WHEN** implementation would require repository/application ownership migration, a public API change, or final native runtime cutover
- **THEN** that work SHALL remain outside this change rather than introducing a compatibility branch.

### Requirement: R7 SHALL complete durable parity without advancing native lifecycle

R7 SHALL implement and verify Rust repository, canonical store, all private typed applications, two read-only candidate canaries, and five-target durability gates while leaving native manifest/lifecycle to R8 and production writer cutover to R9. Repository/canonical parity MAY be accepted independently, but R7 application parity SHALL remain incomplete until each application family has real typed differential evidence.

#### Scenario: R7 completion is claimed
- **WHEN** migration status and acceptance evidence are reviewed
- **THEN** repository and canonical parity are recorded from their durable corpus
- **AND** only application families with typed Node/Rust differential reports are recorded complete
- **AND** no R8 installer/supervisor or R9 production ownership claim is present

#### Scenario: R8 is proposed after the reference slice
- **WHEN** Workbench and Topic typed parity pass but later application clusters remain uncovered
- **THEN** `introduce-synthesis-native-runtime-manifest-v2` remains blocked
- **AND** the thirteen-family inventory cannot be used to waive the missing differentials

### Requirement: Node SHALL remain a frozen oracle only

The Node implementation SHALL remain available for differential tests but SHALL receive no new production route, fallback branch, or shared mutable ownership.

#### Scenario: Candidate failure occurs
- **WHEN** the Rust candidate fails a request or durability test
- **THEN** the failure remains visible and no runtime path executes the Node implementation as a fallback

