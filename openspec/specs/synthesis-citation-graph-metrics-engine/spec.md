# synthesis-citation-graph-metrics-engine Specification

## Purpose
Defines the Synthesis citation graph metrics engine, specifying its processing pipeline, input/output contracts, and integration with the parent capability.
## Requirements
### Requirement: Metrics compute SHALL use a strict environment-neutral contract

The Citation Graph metrics engine SHALL accept and return canonical JSON-safe DTOs containing only the bounded graph slice and metrics v2 facts required for deterministic computation.

#### Scenario: Canonical request is rebuilt

- **WHEN** an application supplies a graph hash, nodes, and edges with unknown JSON-safe fields
- **THEN** the contract SHALL rebuild sorted canonical node and edge rows
- **AND** it SHALL discard unknown fields.

#### Scenario: Invalid input is rejected

- **WHEN** a request is non-JSON, exceeds 5,000 nodes or 20,000 edges, duplicates an identifier, references a missing endpoint, uses an invalid kind, or contains a non-finite or non-positive mention count
- **THEN** canonical rebuilding SHALL reject the request before a metrics kernel runs.

#### Scenario: Result library-node set is invalid

- **WHEN** an engine result omits, duplicates, or adds a library node relative to the request, changes the graph basis or fixed metrics parameters, or contains invalid metric values
- **THEN** result rebuilding SHALL reject the result as malformed.

### Requirement: Metrics kernels SHALL preserve metrics v2 behavior

The active engine SHALL implement Metrics v2 in Rust with the existing weighted PageRank, weak components, year normalization, foundation/frontier scoring, role hints, constants, one-millionth rounding, explicit UTF-16 ordering, and deterministic result structure. The TypeScript implementation SHALL remain only as a frozen differential oracle.

#### Scenario: Existing graph is computed through Rust
- **WHEN** a canonical request is computed by the active engine
- **THEN** its strict result and application-projected canonical metrics hash SHALL match the reviewed Node oracle

#### Scenario: Node worker sources are inspected
- **WHEN** the vertical slice is accepted
- **THEN** no active Node worker Metrics operation, branch, or runtime fallback SHALL remain

### Requirement: Metrics engine package SHALL remain process portable

The metrics engine package SHALL NOT import Node, DOM, Zotero, plugin toolkit, application runtime, repository, filesystem, or application hashing capabilities.

#### Scenario: Engine runs through a test worker

- **WHEN** the same canonical request is computed directly and through the Node-only worker canary
- **THEN** both executions SHALL return the same canonical result after structured clone
- **AND** the worker fixture SHALL remain outside the production plugin dependency graph.

#### Scenario: Checkpoint aborts computation

- **WHEN** an implementation checkpoint throws during a metrics phase
- **THEN** computation SHALL stop without returning a partial result
- **AND** the checkpoint SHALL NOT become part of the serialized compute DTO.
