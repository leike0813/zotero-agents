# synthesis-citation-graph-build-engine Specification

## Purpose
Defines the Synthesis citation graph build engine, specifying its processing pipeline, input/output contracts, and integration with the parent capability.

## Requirements

### Requirement: Graph build SHALL use a strict environment-neutral contract


The Citation Graph build engine SHALL accept and return canonical JSON-safe DTOs containing only bounded resolved graph facts required for deterministic graph assembly.

#### Scenario: Canonical request is rebuilt

- **WHEN** an application supplies source nodes and resolved reference instances with unknown JSON-safe fields
- **THEN** the contract SHALL rebuild stable sorted canonical rows
- **AND** it SHALL discard unknown fields.

#### Scenario: Invalid input is rejected

- **WHEN** a request is non-JSON, exceeds configured source/reference/target bounds, duplicates an identifier, references a missing source, uses an invalid target kind, or contains invalid roles or weights
- **THEN** canonical rebuilding SHALL reject the request before graph assembly runs.

#### Scenario: Invalid result is rejected

- **WHEN** an engine result changes the request version or scope, omits or adds reference instances, contains dangling graph endpoints, or contains inconsistent ownership, incoming-group, aggregate-edge, or light-metric rows
- **THEN** result rebuilding SHALL reject the result as malformed.

### Requirement: Graph build SHALL preserve current graph semantics


The engine SHALL deterministically merge node metadata, materialize resolved targets, build one edge per reference instance, aggregate source-target citations and roles, derive source ownership and incoming groups, and compute lightweight degree metrics.

#### Scenario: Legacy paper graph is built

- **WHEN** the legacy adapter supplies resolved paper references
- **THEN** the engine aggregate graph SHALL preserve existing nodes, edges, role priority, diagnostics, ordering, and application graph hash.

#### Scenario: Production sidecar graph is built

- **WHEN** the production adapter supplies active reference instances with effective canonical and accepted binding targets
- **THEN** the engine SHALL return the same persistence graph facts as the pre-extraction builder
- **AND** application-owned timestamps and hashes SHALL remain outside the engine.

### Requirement: Graph build package SHALL remain process portable


The graph build engine package SHALL NOT import Node, DOM, Zotero, plugin toolkit, application runtime, repository, filesystem, or application hashing capabilities.

#### Scenario: Engine runs through a test worker

- **WHEN** the same canonical request is computed directly and through the Node-only worker canary
- **THEN** both executions SHALL return the same canonical result after structured clone
- **AND** the worker fixture SHALL remain outside the production plugin dependency graph.

#### Scenario: Checkpoint aborts computation

- **WHEN** an implementation checkpoint throws during reference assembly
- **THEN** computation SHALL stop without returning a partial result
- **AND** the checkpoint SHALL NOT become part of the serialized DTO.
