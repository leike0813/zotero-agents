# synthesis-rust-sidecar-complex-kernels Specification

## Purpose
Defines the closed set of complex Rust kernel operations for the Synthesis private sidecar, specifying their execution, publication safety, resource gates, and routing boundaries.

## Requirements

### Requirement: Complex kernels SHALL execute as a closed Rust operation set

The private sidecar SHALL implement `reference_binding.v1`, `reference_canonical_dedupe.v1`, `topic_manifest_validate.v1`, `topic_artifact_assemble.v1`, `topic_artifact_validate.v1`, `topic_section_patch.v1`, `citation_graph_build.v1`, and `citation_graph_build_transfer.v1` in Rust and SHALL reject any undeclared operation.

#### Scenario: Complex private operation is admitted

- **WHEN** a valid request names one of the eight complex operations
- **THEN** the shared Rust child SHALL execute its domain kernel under the common pool bounds
- **AND** no Node compute implementation SHALL run as fallback.

### Requirement: Complex kernel results SHALL be publication-safe

Every result SHALL echo task, operation, canonical request hash, page descriptors, and one terminal frame; the service SHALL verify identities, ordering, hashes, bounds, structure, references, and domain invariants before publication.

#### Scenario: Worker output is malformed

- **WHEN** a result has a wrong request hash, duplicate or missing identity, dangling reference, invalid ordering, bad page hash, truncated stream, or inconsistent terminal frame
- **THEN** publication SHALL fail with a stable worker-result error
- **AND** no partial result or canonical state SHALL be promoted.

### Requirement: Complex kernels SHALL satisfy differential and resource gates

The Rust implementations SHALL match canonical TypeScript oracle results on reviewed fixtures and boundary corpora, and representative matcher, Topic, and graph profiles SHALL satisfy their hard deadline and 256 MiB peak-RSS gates.

#### Scenario: R5 candidate is accepted

- **WHEN** matcher and Topic maximum profiles and the 2,000-source/100,000-reference graph profile each run three times
- **THEN** matcher and Topic runs SHALL each complete below five seconds
- **AND** graph runs SHALL each complete below thirty seconds
- **AND** every worker peak RSS SHALL remain below 256 MiB.

### Requirement: Complex Rust routing SHALL remain private-only

The R5 operations SHALL be reachable only through existing private application and canary composition and SHALL NOT add public HTTP capabilities, SynthesisClient methods, configuration, database ownership, canonical ownership, or Host authority.

#### Scenario: Public inventory is inspected

- **WHEN** the service and client capability inventories are rebuilt
- **THEN** no R5 operation SHALL appear as a new public capability
- **AND** existing production plugin engines and ownership boundaries SHALL remain unchanged.
