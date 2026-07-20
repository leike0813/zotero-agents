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
