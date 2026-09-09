## ADDED Requirements

### Requirement: Runtime Persistence Governance exposes one consolidated interface

Runtime Persistence Governance SHALL own combined usage and integrity scans,
category cleanup, issue cleanup, and age-based retention behind one module
interface. Filesystem adapter selection and managed path policy SHALL remain in
runtime persistence.

#### Scenario: Preferences scan managed runtime data

- **WHEN** preferences requests a governance scan
- **THEN** one governance operation SHALL return the existing usage snapshot and integrity report
- **AND** callers SHALL NOT compose the two scans themselves.

#### Scenario: Governance performs cleanup

- **WHEN** category, issue, or retention cleanup is requested
- **THEN** governance SHALL determine eligible records and paths
- **AND** physical filesystem work SHALL use runtime persistence operations.

## MODIFIED Requirements

### Requirement: Sidecar runtime installs have a fixed managed persistence root

Runtime persistence SHALL reserve
`runtime/synthesis/service-runtime` for product-owned Synthesis runtime
versions, staging directories, and active/previous pointers.

#### Scenario: Installer creates or repairs a runtime

- **WHEN** the Synthesis runtime installer writes, moves, verifies, or removes
  runtime assets
- **THEN** every affected path SHALL remain below the fixed service-runtime root
- **AND** arbitrary user or manifest-provided absolute paths SHALL not be used.

### Requirement: Runtime pointer replacement is atomic

Runtime persistence SHALL provide a fail-closed atomic text
replacement primitive for managed pointer files.

#### Scenario: Atomic replacement is available

- **WHEN** active or previous runtime pointer content is updated
- **THEN** a complete temporary sibling SHALL be atomically moved over the
  target
- **AND** readers SHALL observe either the prior or complete new document.

#### Scenario: Atomic replacement is unavailable

- **WHEN** the runtime cannot guarantee atomic replacement
- **THEN** the pointer update SHALL fail
- **AND** it SHALL not fall back to remove-then-write behavior.
