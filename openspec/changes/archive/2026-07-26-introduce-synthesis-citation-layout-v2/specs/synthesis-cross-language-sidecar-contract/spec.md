## ADDED Requirements

### Requirement: Cross-language contract SHALL cover Citation Graph Layout v2

The shared schema inventory, positive/negative corpus, canonical edge corpus, operation mapping, and fingerprint SHALL include `citation_graph_layout.v2`.

#### Scenario: Valid layout corpus is checked

- **WHEN** TypeScript and Rust rebuild the same v2 request and result fixtures
- **THEN** they SHALL agree on canonical field values, ordering, identifiers, version, engine, parameters, node membership, finite numbers, and hashes.

#### Scenario: Invalid layout corpus is checked

- **WHEN** a fixture contains an unknown algorithm, invalid hash, duplicate node, missing endpoint, non-finite coordinate, unsupported engine/version, extra result node, or graph over the accepted bounds
- **THEN** both boundaries SHALL reject it with the mapped stable failure class.

#### Scenario: Cancellation crosses the protocol

- **WHEN** an active layout task receives the existing cancel frame
- **THEN** the Rust worker SHALL stop at an iterative checkpoint and return the standard canceled terminal outcome.
