## MODIFIED Requirements

### Requirement: Workflow Host API version consumers SHALL recognize v11

The current Workflow Host Contract Identity SHALL declare version 11 once. Internally created workflow projections, loader globals, runtime contexts, capability summaries, debug probes, tests, and current SSOT documentation SHALL resolve that version from the identity owner rather than maintaining independent current-version declarations.

#### Scenario: Current projection is carried into a workflow runtime

- **WHEN** the system creates or injects the current Workflow Host projection without an explicit compatibility override
- **THEN** the runtime, loader global, and diagnostics SHALL report version 11
- **AND** the reported version SHALL agree with the projection's own version.

#### Scenario: Explicit legacy version is supplied

- **WHEN** a test or legacy adapter supplies an explicit finite Workflow Host version
- **THEN** that explicit version SHALL take precedence over the selected projection's version
- **AND** an unidentifiable external adapter SHALL remain unknown rather than being reported as the current version.

#### Scenario: Built-in package checks its compatibility policy

- **WHEN** the self-contained built-in package resolves a Workflow Host version
- **THEN** versions 2 through the current version SHALL pass its declared compatibility range
- **AND** versions outside that range SHALL fail deterministically
- **AND** conformance verification SHALL fail when the range no longer accepts the current contract identity.

## ADDED Requirements

### Requirement: Workflow Host contract variants SHALL have explicit capability conformance

The system SHALL distinguish interactive and non-interactive Workflow Host Contract Variants from hook execution modes. Conformance gates SHALL validate each variant against the declared top-level capability identities without turning the production runtime into an eager whole-contract rejection path.

#### Scenario: Interactive projection is checked

- **WHEN** conformance verifies the interactive projection
- **THEN** every declared interactive capability SHALL be present
- **AND** `resources` MAY be absent.

#### Scenario: Non-interactive projection is checked

- **WHEN** conformance verifies the non-interactive projection
- **THEN** `resources` SHALL be present
- **AND** interactive picker and editor members SHALL remain structurally available while interaction attempts fail with `workflow_interaction_required`.

#### Scenario: Projection shape drifts

- **WHEN** a tested projection omits a variant-required top-level capability or exposes an undeclared top-level capability
- **THEN** conformance SHALL return structured missing or unexpected capability identities
- **AND** the test/build gate SHALL fail.

### Requirement: Workflow Host capability summaries SHALL report observed availability

Workflow Host capability summaries SHALL be runtime observations derived from the declared capability identities. A summary SHALL NOT define the contract identity or silently omit a declared top-level capability.

#### Scenario: Variant summary is emitted

- **WHEN** loader, runtime, input-planning, or debug diagnostics summarize a selected Workflow Host projection
- **THEN** they SHALL use the shared identity owner
- **AND** the summary SHALL preserve existing diagnostic fields while reporting `command` and `resources` availability.

### Requirement: Active Workflow Host documentation SHALL declare only the current version

Current SSOT documentation and active OpenSpec SHALL describe the current Workflow Host contract. Archived changes MAY retain historical version declarations.

#### Scenario: Documentation version declarations are checked

- **WHEN** the contract governance test scans explicit `Workflow Host API vN` declarations in current SSOT documentation and active OpenSpec
- **THEN** every declaration SHALL match the current contract identity version
- **AND** archived change documents SHALL be excluded.
