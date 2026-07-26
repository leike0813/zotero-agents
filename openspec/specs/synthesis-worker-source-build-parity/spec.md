# synthesis-worker-source-build-parity Specification

## Purpose
Defines the synthesis worker source build parity capability for the Synthesis plugin, specifying its service boundary, integration contracts, and runtime behavior.

## Requirements

### Requirement: Source Workers SHALL resolve source-owned runtime modules


Source Worker harnesses SHALL resolve TypeScript engine entrypoints against the
modules present in the source tree and SHALL NOT require generated JavaScript
shims beside source files.

#### Scenario: Topic Graph source Worker starts

- **WHEN** the Topic Graph index Worker fixture loads the engine from the source tree
- **THEN** every runtime-relative engine dependency resolves without `ERR_MODULE_NOT_FOUND`
- **AND** no compiled JavaScript shim is required in the source tree

### Requirement: Compiled Workers SHALL use native Node ESM extensions


The Synthesis service build SHALL rewrite relative TypeScript module specifiers
to `.js` in emitted JavaScript and SHALL NOT leave runtime `.ts` specifiers in
compiled engine modules.

#### Scenario: Topic Graph engine is compiled

- **WHEN** the Synthesis service build emits `topicGraphIndex.js`
- **THEN** its runtime import and re-export reference `topicGraphCore.js`
- **AND** the emitted module contains no runtime reference to `topicGraphCore.ts`

### Requirement: Direct and Worker execution SHALL remain semantically equal


The source and compiled Topic Graph Worker canaries SHALL rebuild canonical
results that equal direct in-process engine execution for the same request.

#### Scenario: Canonical Topic Graph request crosses a Worker boundary

- **WHEN** a bounded canonical request is executed directly and through a Topic Graph Worker
- **THEN** the rebuilt Worker result equals the rebuilt direct result
- **AND** public service inventory and package contents remain unchanged

### Requirement: Topic Graph TypeScript Worker parity SHALL survive Rust routing

Moving the private sidecar Topic Graph operation to Rust SHALL NOT remove or weaken the source and compiled TypeScript Worker canaries that guard environment-neutral engine resolution.

#### Scenario: Topic Graph canaries run after migration

- **WHEN** source and emitted Topic Graph Worker fixtures execute the same canonical request as the direct TypeScript engine
- **THEN** both rebuilt results SHALL remain equal
- **AND** no source-tree JavaScript shim SHALL exist.

### Requirement: Worker audit surfaces SHALL cover fourteen Rust operations

Source fingerprinting, build fingerprinting, runtime freshness, operation inventory, smoke tests, compressed-size inventory, lockfile identity, licenses, and provenance SHALL cover the complete fourteen-operation Rust candidate.

#### Scenario: Candidate is packaged

- **WHEN** a native worker candidate is assembled
- **THEN** undeclared, stale, missing, duplicate, or source/build-divergent operation artifacts SHALL fail the build
- **AND** compressed candidate size SHALL remain below 15 MiB.

### Requirement: Migrated Node worker fixtures SHALL be removed

Node source and compiled worker parity fixtures SHALL remain only for the R6 Citation Graph layout kernel; matcher, Topic Structured Artifact, and Citation Graph Build worker fixtures and compute branches SHALL be absent.

#### Scenario: Worker sources are inspected after R5

- **WHEN** static parity checks enumerate Node worker operations
- **THEN** no migrated R5 operation SHALL be present
- **AND** the remaining Node worker surface SHALL be limited to layout.

### Requirement: Source and build parity SHALL inventory Layout v2

Worker source identity, binary smoke, runtime freshness, candidate provenance, and operation inventory SHALL include `citation_graph_layout.v2` and the pinned toolchain/dependency identity.

#### Scenario: Candidate smoke enumerates operations

- **WHEN** a native candidate is built and inspected
- **THEN** its closed operation inventory SHALL contain all fifteen production operations including layout v2
- **AND** no Node layout worker source identity SHALL remain.

#### Scenario: Toolchain or layout source changes

- **WHEN** the dated nightly, Cargo lock, layout crate source, operation mapping, or build inputs change
- **THEN** source/build fingerprints and candidate freshness SHALL change together.
