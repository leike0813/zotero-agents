# synthesis-worker-source-build-parity Specification

## Purpose
Defines the synthesis worker source build parity capability for the Synthesis plugin, specifying its service boundary, integration contracts, and runtime behavior.

## Requirements

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

### Requirement: Worker audit surfaces SHALL cover fourteen Rust operations

Source fingerprinting, build fingerprinting, runtime freshness, operation inventory, smoke tests, compressed-size inventory, lockfile identity, licenses, and provenance SHALL cover the complete fourteen-operation Rust candidate.

#### Scenario: Candidate is packaged

- **WHEN** a native worker candidate is assembled
- **THEN** undeclared, stale, missing, duplicate, or source/build-divergent operation artifacts SHALL fail the build
- **AND** compressed candidate size SHALL remain below 15 MiB.

### Requirement: Source and build parity SHALL inventory Layout v2

Worker source identity, binary smoke, runtime freshness, candidate provenance, and operation inventory SHALL include `citation_graph_layout.v2` and the pinned toolchain/dependency identity.

#### Scenario: Candidate smoke enumerates operations

- **WHEN** a native candidate is built and inspected
- **THEN** its closed operation inventory SHALL contain all fifteen production operations including layout v2
- **AND** no Node layout worker source identity SHALL remain.

#### Scenario: Toolchain or layout source changes

- **WHEN** the dated nightly, Cargo lock, layout crate source, operation mapping, or build inputs change
- **THEN** source/build fingerprints and candidate freshness SHALL change together.

### Requirement: Source and build fingerprints SHALL include the Rust durable foundation

The source/build inventory SHALL include the repository, canonical-store, and application crates, their contract fixtures, exact Cargo dependency graph, and the two read canary registrations in addition to all fifteen compute operations.

#### Scenario: Durable source changes without a rebuilt candidate
- **WHEN** any inventoried durable source, fixture, feature, or dependency changes while candidate metadata remains unchanged
- **THEN** freshness and source/build parity checks fail

### Requirement: Candidate smoke SHALL cover compute and durable reads

Candidate smoke SHALL execute every public native compute operation,
authenticated durable reads, production service identity/handshake, and the
exact forward capability roster. The source-bound native production-route gate
SHALL verify the exact production-operation catalog and at least one bounded
non-mutating RPC from each of the seven production operation surfaces. Full
operation behavior SHALL remain covered by language-neutral corpora and
Rust/public route tests; package smoke MUST NOT depend on a Node executable.

#### Scenario: Smoke inventory is incomplete
- **WHEN** candidate smoke omits a public compute operation, required durable read, production identity field, or forward-roster entry, or the source-bound route gate omits a production catalog entry or representative surface RPC
- **THEN** source/build smoke fails before packaging acceptance

#### Scenario: Smoke attempts Node comparison
- **WHEN** candidate smoke requires a Node service, JavaScript worker, Node build output, or removed workspace fixture
- **THEN** the native-only source/build gate fails
