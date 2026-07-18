## ADDED Requirements

### Requirement: Public service migration inventory is complete

The project SHALL maintain one machine-readable migration inventory covering every public method returned by the active Synthesis service, every direct production consumer, and each method's target capability or deletion disposition.

#### Scenario: Service public surface changes
- **WHEN** a public method is added to or removed from the active Synthesis service
- **THEN** the boundary guard SHALL fail until the migration inventory contains the same method set and a valid disposition

#### Scenario: Direct consumer grows during migration
- **WHEN** production code adds a new direct dependency on the full Synthesis service or default service getter
- **THEN** the boundary guard SHALL fail unless the dependency is an explicitly allowed composition adapter

### Requirement: Migration preserves a single production owner

The staged migration SHALL keep exactly one production owner for `synthesis.db` and the Topic canonical root, and shadow implementations SHALL use isolated storage with Zotero writes disabled.

#### Scenario: Work runs before production cutover
- **WHEN** a sidecar implementation is exercised before the ownership cutover
- **THEN** it SHALL use an isolated DB and canonical root
- **AND** the plugin SHALL remain the only production owner

#### Scenario: Production ownership is cut over
- **WHEN** the service is enabled as the production owner
- **THEN** the plugin repository and canonical writer SHALL already be closed
- **AND** automatic in-process fallback SHALL be disabled

### Requirement: Cross-process contracts are bounded and environment-neutral

Cross-process Synthesis contracts SHALL expose grouped use cases with JSON-safe DTOs, stable error codes, explicit profile/library scope, bounded pagination, and controlled asset locators, and SHALL NOT expose repository rows, absolute paths, Zotero objects, functions, or an unbounded remote service object.

#### Scenario: A list capability is introduced
- **WHEN** a contract returns a collection of domain values
- **THEN** it SHALL define a cursor or equivalent bounded continuation and an enforced maximum page size

#### Scenario: A service error crosses the boundary
- **WHEN** a request fails
- **THEN** callers SHALL use the stable error code and structured fields for control flow
- **AND** the human-readable message SHALL remain diagnostic only

### Requirement: Zotero access is mediated by Host Capabilities

The sidecar service SHALL NOT import plugin modules, access `globalThis.Zotero`, or read the Zotero SQLite database, and all Zotero reads and writes SHALL cross bounded Host Capability ports.

#### Scenario: Service needs library data
- **WHEN** a service use case needs item, artifact, note, attachment, mirror, or relation state
- **THEN** it SHALL issue a bounded semantic Host Capability request
- **AND** it SHALL NOT receive live Zotero objects

#### Scenario: Service requests a Zotero mutation
- **WHEN** a service use case requests a mirror or related-item write
- **THEN** the request SHALL contain an effect identity, precondition, permission context, and expected scope
- **AND** the plugin SHALL return a structured receipt outside any service SQLite write transaction

### Requirement: Control-plane and compute ownership are separated

The service main process SHALL own protocol, explicit operation state, short repository transactions, canonical commits, and Host effect orchestration, while CPU-heavy kernels SHALL execute in a bounded worker pool without persistence or Host access.

#### Scenario: CPU-heavy computation starts
- **WHEN** graph, layout, metrics, matching, tag, concept, or topic-graph computation exceeds the defined synchronous budget
- **THEN** the main process SHALL submit pure serializable input to a bounded worker
- **AND** health, cancellation, progress, and shutdown handling SHALL remain responsive

#### Scenario: Worker fails
- **WHEN** a worker crashes, hangs, or exceeds its resource budget
- **THEN** the current phase SHALL fail or cancel with a stable diagnostic
- **AND** the previous projection, production DB, and canonical current files SHALL remain valid

### Requirement: Product-owned runtime is fail-closed

The plugin SHALL launch only a pinned, verified, product-owned runtime by controlled absolute path and SHALL NOT resolve system Node, npm, PATH entries, or user shell configuration.

#### Scenario: Runtime is missing or invalid
- **WHEN** the packaged or extracted runtime is missing, partially installed, corrupted, or fingerprint-incompatible
- **THEN** Synthesis SHALL become unavailable with a bounded diagnostic
- **AND** no production mutation SHALL start

#### Scenario: Platform has no Stage 1 runtime
- **WHEN** the plugin runs outside Windows x64, macOS x64/arm64, or Linux x64/arm64
- **THEN** Synthesis SHALL report a stable unsupported-platform state
- **AND** non-Synthesis plugin capabilities SHALL continue

### Requirement: Active documentation follows implemented state

Active Synthesis documentation SHALL describe the currently implemented owner and process topology, while future sidecar behavior remains in active OpenSpec changes until implemented.

#### Scenario: Client seam exists but runtime is still in-process
- **WHEN** consumers have migrated to a typed client but production execution remains in-process
- **THEN** active documentation SHALL describe the client seam and the in-process implementation
- **AND** it SHALL NOT claim that the Node service owns production storage

#### Scenario: Ownership cutover completes
- **WHEN** verification confirms the service is the sole production owner
- **THEN** active documentation and affected main specs SHALL be updated in the same change

### Requirement: Cutover and rollback are gated

Production ownership cutover SHALL require verified backups, migration dry-run, owner locking, capability/health/schema/profile checks, representative parity, and a tested restore path.

#### Scenario: A cutover prerequisite fails
- **WHEN** any ownership, migration, health, parity, runtime integrity, worker isolation, or restore gate fails
- **THEN** mutation enablement SHALL stop
- **AND** the plugin SHALL NOT attempt direct writes while service ownership is uncertain

#### Scenario: Failure occurs after remote mutation is enabled
- **WHEN** the production service fails after accepting mutations
- **THEN** recovery SHALL restart or repair the service, or stop it and perform a verified restore
- **AND** the plugin SHALL NOT automatically resume in-process ownership
