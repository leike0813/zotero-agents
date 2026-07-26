## ADDED Requirements

### Requirement: Layout kernels SHALL preserve versioned deterministic behavior

The layout engine contract SHALL identify force, radial, and components requests while production computation is owned by the Rust layout v2 crate. The TypeScript package SHALL retain strict request/result DTO rebuilding and projection helpers but SHALL NOT retain a production layout kernel.

#### Scenario: Canonical request is rebuilt

- **WHEN** an application supplies a graph hash, supported algorithm, nodes, and edges with unknown JSON-safe fields
- **THEN** the contract SHALL rebuild sorted canonical node and edge rows
- **AND** it SHALL discard unknown fields before dispatch.

#### Scenario: Rust result is rebuilt

- **WHEN** a layout v2 result returns from the native worker
- **THEN** the TypeScript boundary SHALL validate engine/version identity, parameters, exact node membership, and finite coordinates
- **AND** it SHALL NOT rerun a TypeScript algorithm to establish trust.

#### Scenario: Runtime dependency boundary is inspected

- **WHEN** production layout dependencies are traversed
- **THEN** no d3-force, Node worker, DOM, Zotero, repository, or filesystem layout implementation SHALL be reachable from the engine contract.

## REMOVED Requirements

### Requirement: Layout kernels SHALL preserve deterministic behavior

**Reason**: This requirement binds production output to the removed d3-force/TypeScript v1.2 implementation and conflicts with the intentionally new Rust Layout v2.

**Migration**: Use the versioned deterministic and quality requirements in `synthesis-citation-graph-layout-v2`; legacy v1.2 rows remain stale, rebuildable cache data.

### Requirement: Engine package SHALL remain process portable

**Reason**: Direct and Node test-worker execution are no longer production or parity contracts after all kernels move to the Rust child.

**Migration**: Keep only environment-neutral TypeScript DTO rebuilders and validate the Rust worker path through the cross-language contract and production routing suites.
