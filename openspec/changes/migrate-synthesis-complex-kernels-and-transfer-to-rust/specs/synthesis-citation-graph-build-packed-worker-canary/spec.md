## ADDED Requirements

### Requirement: Packed graph execution SHALL use the Rust child
Both bounded packed graph canary and staged graph transfer SHALL execute through the same `synthesis-citation-graph-build` Rust kernel, with direct and streaming adapters sharing domain semantics.

#### Scenario: Direct and transfer adapters are compared
- **WHEN** the same bounded graph request runs through monolithic and transfer adapters
- **THEN** canonical result rows, page bytes, hashes, lengths, ordering, diagnostics, and graph facts SHALL be identical.

### Requirement: Node graph-build worker code SHALL be retired
The private Node graph-build worker, packed carrier, and test-only graph fixtures SHALL be removed after Rust differential, fault, resource, and transfer-atomicity gates pass.

#### Scenario: Service bundle is inspected
- **WHEN** emitted Node worker sources and runtime imports are enumerated
- **THEN** no Citation Graph Build compute kernel or packed transfer implementation SHALL remain.
