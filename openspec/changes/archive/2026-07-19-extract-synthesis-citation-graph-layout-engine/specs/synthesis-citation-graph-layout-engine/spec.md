## ADDED Requirements

### Requirement: Layout compute SHALL use a strict environment-neutral contract

The Citation Graph layout engine SHALL accept and return canonical JSON-safe DTOs that contain only the bounded graph slice and deterministic layout facts required for computation, including optional node title/year tie-break inputs and finite application-derived initial coordinates.

#### Scenario: Canonical request is rebuilt

- **WHEN** an application supplies a graph hash, supported algorithm, nodes, and edges with unknown JSON-safe fields
- **THEN** the engine contract SHALL rebuild sorted canonical node and edge rows
- **AND** it SHALL discard the unknown fields.

#### Scenario: Invalid input is rejected before computation

- **WHEN** a request is non-JSON, exceeds 5,000 nodes or 20,000 edges, duplicates an identifier, references a missing endpoint, or uses an invalid hash or algorithm
- **THEN** canonical rebuilding SHALL reject the request before a layout kernel runs.

#### Scenario: Result node set is invalid

- **WHEN** an engine result contains non-finite coordinates or omits, duplicates, or adds a node relative to the request
- **THEN** result rebuilding SHALL reject the result as malformed.

### Requirement: Layout kernels SHALL preserve deterministic behavior

The engine SHALL implement the existing force, radial, and components algorithms with the current layout engine, version, parameters, and deterministic coordinate behavior.

#### Scenario: Existing graph is computed in-process

- **WHEN** a canonical request is computed by the in-process engine
- **THEN** its coordinates and application-projected layout hash SHALL match the pre-extraction implementation for the same graph and algorithm.

#### Scenario: Isolated nodes are computed

- **WHEN** a valid graph contains isolated nodes
- **THEN** every input node SHALL receive one finite deterministic coordinate.

### Requirement: Engine package SHALL remain process portable

The engine package SHALL NOT import Node, DOM, Zotero, plugin toolkit, application runtime, repository, or filesystem capabilities.

#### Scenario: Engine runs through a test worker

- **WHEN** the same canonical request is computed directly and through the Node-only worker canary
- **THEN** both executions SHALL return the same canonical result after structured-clone or JSON round-trip
- **AND** the worker fixture SHALL remain outside the production plugin dependency graph.
