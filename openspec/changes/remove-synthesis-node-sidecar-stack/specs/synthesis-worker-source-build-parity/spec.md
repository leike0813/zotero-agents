## REMOVED Requirements

### Requirement: Source Workers SHALL resolve source-owned runtime modules
**Reason**: The requirement governs TypeScript/Node source Worker module resolution. R9b deletes that worker implementation.
**Migration**: Rust worker source/build identity, Cargo inputs, operation inventory, and native worker tests become the only worker implementation gate.

### Requirement: Compiled Workers SHALL use native Node ESM extensions
**Reason**: The compiled JavaScript worker/service build is removed.
**Migration**: No emitted Node worker modules remain; Rust binaries are checked through Cargo source/build fingerprints and native smoke.

### Requirement: Direct and Worker execution SHALL remain semantically equal
**Reason**: This requirement compares direct TypeScript execution with a Node Worker implementation that no longer exists.
**Migration**: Stable operation semantics remain in language-neutral corpora and Rust engine/worker/application tests.

### Requirement: Topic Graph TypeScript Worker parity SHALL survive Rust routing
**Reason**: R9b ends the temporary executable TypeScript oracle allowance.
**Migration**: Topic Graph corpus, Rust direct/worker parity, source/build fingerprints, and public production-route tests retain the accepted behavior.

### Requirement: Migrated Node worker fixtures SHALL be removed
**Reason**: The transitional partial-removal requirement is superseded by complete removal of the Node worker stack.
**Migration**: The source/build gate now requires zero Node worker fixtures or compute branches.

## ADDED Requirements

### Requirement: Rust worker source/build parity SHALL be the sole implementation gate

Worker source/build identity SHALL cover the Rust worker/service source, Cargo
workspace and lockfile, pinned toolchain, features, all production compute
operations, operation mapping, licenses, provenance, and build recipe. Rust
tests SHALL cover framing, bounds, transfer integrity, deadline, cancellation,
busy admission, crash, hang kill, respawn, fuse, shutdown, and cleanup. No
TypeScript/Node worker executable or source/build comparison may be required.

#### Scenario: Rust worker candidate is built
- **WHEN** a supported target candidate is assembled
- **THEN** source/build fingerprints, closed operation inventory, worker reliability tests, provenance, licenses, and size gates agree
- **AND** any Node worker source, fixture, emitted module, or undeclared operation fails the gate

#### Scenario: Rust worker input changes
- **WHEN** source, Cargo dependency, toolchain, feature, operation mapping, or build recipe changes
- **THEN** candidate freshness and build identity change together

## MODIFIED Requirements

### Requirement: Candidate smoke SHALL cover compute and durable reads

Candidate smoke SHALL execute all production compute operations, authenticated
durable reads, production service identity/handshake, the exact complete
96-operation ready roster, and at least one bounded non-mutating RPC from each
of the seven production operation surfaces. Full operation behavior SHALL
remain covered by language-neutral corpora and Rust/public route tests; package
smoke MUST NOT depend on a Node executable.

#### Scenario: Smoke inventory is incomplete
- **WHEN** the built candidate omits a compute operation, required durable read, production identity field, ready-roster entry, or representative surface RPC
- **THEN** source/build smoke fails before packaging acceptance

#### Scenario: Smoke attempts Node comparison
- **WHEN** candidate smoke requires a Node service, JavaScript worker, Node build output, or removed workspace fixture
- **THEN** the native-only source/build gate fails
