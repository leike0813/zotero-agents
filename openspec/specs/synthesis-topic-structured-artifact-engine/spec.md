# synthesis-topic-structured-artifact-engine Specification

## Purpose
Define the environment-neutral compute boundary for Topic Synthesis manifest
validation, structured artifact assembly and validation, and section-patch
computation.

## Requirements

### Requirement: Topic Structured Artifact engine SHALL use strict environment-neutral contracts

The engine SHALL expose asynchronous manifest-validation, artifact-assembly,
artifact-validation, and section-patch methods using versioned JSON-safe DTOs
without Node, Zotero, DOM, plugin, file, database, network, or Host imports.

#### Scenario: Request crosses a process boundary

- **WHEN** a structured-artifact request is serialized and rebuilt
- **THEN** the engine SHALL preserve all valid domain JSON
- **AND** it SHALL reject invalid versions, cycles, non-finite numbers, non-plain objects, and over-limit input before computation.

#### Scenario: Result returns from an untrusted worker

- **WHEN** the application receives an engine result
- **THEN** it SHALL rebuild and recompute the canonical result against the request
- **AND** it SHALL reject malformed, fabricated, or basis-inconsistent output.

### Requirement: Topic Structured Artifact engine SHALL preserve current semantics

The engine SHALL preserve current manifest rules, structured artifact content
validation, deterministic assembly, and section read-set patch semantics.

#### Scenario: Current artifact is valid

- **WHEN** a current complete manifest and sections satisfy the existing Host contract
- **THEN** engine assembly and validation SHALL produce the current schema and no validation errors.

#### Scenario: Patch read set conflicts

- **WHEN** any read section hash differs from the current section hash
- **THEN** section patch computation SHALL return an ordered conflict result
- **AND** it SHALL NOT return merged sections.

### Requirement: Topic Structured Artifact engine SHALL be bounded and cancellable

Engine traversal SHALL enforce production JSON bounds and deterministic
checkpoints.

#### Scenario: Input exceeds a production bound

- **WHEN** depth, collection, property, node, string, or aggregate content limits are exceeded
- **THEN** the engine SHALL fail with `invalid_request` before application persistence.

#### Scenario: Cancellation is requested

- **WHEN** a checkpoint observes cancellation
- **THEN** the engine SHALL abort without returning a promotable result.

### Requirement: Topic Structured Artifact engine SHALL be process-portable

The in-process implementation and test-only Node worker implementation SHALL
share one contract and produce identical canonical results.

#### Scenario: Worker canary computes an artifact operation

- **WHEN** a canonical request runs in-process and through the worker canary
- **THEN** rebuilt results SHALL be deeply equal
- **AND** the worker SHALL have no access to production persistence or Host capabilities.

### Requirement: Private Topic Structured Artifact execution SHALL use Rust

Private manifest validation, artifact assembly, artifact validation, and section patch computation SHALL use the four declared Rust operations through the shared pool; TypeScript SHALL remain only the plugin production implementation and differential oracle.

#### Scenario: Isolated Topic apply runs

- **WHEN** the private Topic application validates, assembles, validates, or patches an artifact
- **THEN** it SHALL invoke the corresponding Rust operation
- **AND** it SHALL NOT create an in-process or Node-worker Topic engine.

### Requirement: Arbitrary Topic JSON SHALL use canonical chunk paging

Nested Topic values SHALL be serialized as canonical UTF-8, split into ordered hash-addressed chunks below the page envelope, and reconstructed subject to the existing 32 MiB aggregate-string and one-million-node bounds.

#### Scenario: Topic value crosses one page

- **WHEN** a valid nested artifact is larger than one bounded page
- **THEN** ordered chunks SHALL reconstruct exactly the canonical value
- **AND** no line-sized giant object or full-payload base64 copy SHALL be required.

### Requirement: Topic result validation SHALL preserve failure atomicity

Production rebuilders SHALL verify result structure, versions, request identity, hashes, section identity, ordering, read-set consistency, manifest/artifact invariants, and patch status without rerunning the complete TypeScript algorithm.

#### Scenario: Topic result fails validation

- **WHEN** a result is malformed, basis-inconsistent, dangling, over-limit, truncated, or reports an invalid patch transition
- **THEN** it SHALL be rejected
- **AND** current canonical Topic state SHALL remain unchanged.
