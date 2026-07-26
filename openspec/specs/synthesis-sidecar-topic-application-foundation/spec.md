# synthesis-sidecar-topic-application-foundation Specification

## Purpose
Defines the application-level foundation for the Synthesis sidecar topic component, including its service boundary, lifecycle, and integration with the sidecar runtime.

## Requirements

### Requirement: Topic application inputs are strict and environment neutral

The application SHALL rebuild bounded list, detail, and apply requests, SHALL accept apply artifacts only as materialized assets, and SHALL reject unknown fields, duplicate asset IDs, traversal, absolute or URL paths, unsupported media types, missing assets, and bound violations before persistence.

#### Scenario: Workspace authority cannot cross the application boundary
- **WHEN** an apply request contains a path, reader, function, Zotero object, duplicate asset, or unmaterialized reference
- **THEN** the request fails as invalid before an operation row or canonical write is created

### Requirement: Topic application supports complete and patch apply

The application SHALL support `create`, `update_full`, and `update_patch`, use the structured-artifact engine for validation/assembly/patching, construct a complete canonical snapshot, and preserve existing Topic hash and result semantics.

#### Scenario: Structured patch inherits unchanged sections
- **WHEN** a patch has matching manifest, artifact, and declared section read-set hashes
- **THEN** changed sections replace their predecessors, unchanged sections are inherited, and one complete validated snapshot is promoted

### Requirement: Canonical promotion is the apply commit point

The application SHALL perform all request, asset, schema, Topic existence, basis, and patch checks before promotion; create SHALL use a null expected basis and updates SHALL use the read manifest/artifact basis.

#### Scenario: Optimistic conflict has zero domain writes
- **WHEN** the expected basis or patch read-set differs from current
- **THEN** apply returns a stable conflict result without changing canonical current or derived projections

#### Scenario: Projection failure follows successful promotion
- **WHEN** canonical promotion succeeds but a registry, graph, concept, discovery, or operation receipt update fails
- **THEN** current remains committed and apply returns success with stable warning diagnostics

### Requirement: List and detail are bounded canonical-backed projections

List SHALL read indexed Topic registry state with stable pagination, and detail SHALL combine one registry record with one strictly rebuilt canonical snapshot without scanning Topic directories.

#### Scenario: Sidecar restart preserves Topic reads
- **WHEN** an isolated Topic is applied, the service owners close, and the same identities reopen
- **THEN** list and detail return the persisted Topic and canonical hashes without startup content scanning

### Requirement: Topic apply owns explicit operation lifecycle

Each admitted apply SHALL create one `topic_apply` operation, update stable validation, assembly, promotion, and projection phases, and terminate as completed or failed without treating cache readiness as operation completion.

#### Scenario: Pre-commit failure is terminal
- **WHEN** validation or canonical promotion fails before the commit point
- **THEN** the operation records a failed terminal phase and no current snapshot is changed

### Requirement: Isolated application composition is not a production route

The service SHALL compose the Topic application only over identity-bound shadow owners and SHALL NOT advertise a remote Topic apply capability or receive production paths.

#### Scenario: Production ownership remains unchanged
- **WHEN** the isolated Topic application is present in the packaged service
- **THEN** public Synthesis routing, production roots, engine owners, worker routes, and `mutationEnabled:false` remain unchanged

### Requirement: Topic application SHALL receive a Rust pool adapter

Private Topic application composition SHALL inject a pool-backed Structured Artifact engine implementing the existing application port and SHALL preserve validation, assembly, patch conflicts, canonical promotion, projection warnings, and operation lifecycle.

#### Scenario: Rust Topic operation fails before promotion

- **WHEN** validation, assembly, or patch computation is canceled, times out, crashes, or returns invalid output
- **THEN** the apply operation SHALL fail before the canonical commit point
- **AND** no current Topic state or derived projection SHALL change.

### Requirement: Rust Topic application SHALL expose typed library entry points

The Rust application crate SHALL expose typed `list`, `detail`, `apply`, `stop_admission`, and bounded `shutdown` entry points using the existing Topic request/result limits and stable status, error, and warning codes. It SHALL NOT expose a generic application-kind executor or remote Topic mutation capability.

#### Scenario: Typed boundary is audited
- **WHEN** Rust application exports and candidate capabilities are inspected
- **THEN** Topic behavior is reachable through typed library APIs
- **AND** no `ApplicationKind`, generic application command, string compute port, HTTP apply capability, or hidden Node fallback exists

### Requirement: Rust Topic commit and follow-up semantics SHALL match the oracle

The Rust Topic application SHALL support `create`, `update_full`, and `update_patch`, inject a typed Structured Artifact engine, use canonical promotion as the only domain commit point, and treat post-promotion projection or operation-receipt failure as an ordered stable warning without rolling back current.

#### Scenario: Failure occurs around the commit point
- **WHEN** validation, compute, basis, or promotion fails before commit
- **THEN** no canonical current, Topic state, or Topic projection is written
- **AND WHEN** projection or receipt fails after promotion
- **THEN** current remains committed and success contains the matching stable warning

### Requirement: Rust Topic admission shutdown SHALL drain active applies

Stopping admission SHALL reject new apply requests while allowing already admitted applies to reach a terminal state. Shutdown SHALL wait only within its supplied bound for active applies and SHALL preserve reopen consistency.

#### Scenario: Shutdown overlaps an apply
- **WHEN** admission stops while one apply is active and another apply arrives
- **THEN** the new apply is rejected with the stable admission code
- **AND** bounded shutdown either observes the first apply drain or reports the stable drain timeout without corrupting durable state
