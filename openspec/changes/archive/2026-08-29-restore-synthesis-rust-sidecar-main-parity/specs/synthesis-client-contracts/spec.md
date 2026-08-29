## MODIFIED Requirements

### Requirement: Client capabilities are grouped and use-case shaped

The `SynthesisClient` SHALL expose bounded domain capabilities and SHALL NOT reproduce the legacy flat service object. The grouped client SHALL preserve the fixed baseline's user-visible semantics while internal native composition MAY use pages, locators, transfers, and delivery descriptors. Full-library and worker-backed mutations SHALL return the existing public maintenance-operation receipt, and all consumers MUST observe completion through the operation capability rather than a second synchronous implementation.

#### Scenario: Workflow Topic options are requested
- **WHEN** a caller requests workflow Topic options
- **THEN** it SHALL call `client.topics.listWorkflowOptions` with the bounded filter request
- **AND** it SHALL receive the package-owned JSON-safe option result

#### Scenario: New use case is migrated
- **WHEN** a baseline consumer needs another Synthesis use case
- **THEN** the contract SHALL add or map it to the relevant capability group
- **AND** the migration inventory SHALL record its exact baseline disposition

#### Scenario: Long mutation is requested
- **WHEN** a grouped client starts full-library or worker-backed work
- **THEN** it SHALL receive `SynthesisPublicMaintenanceOperation`
- **AND** it SHALL NOT wait on a hidden synchronous fallback

## ADDED Requirements

### Requirement: Native composition SHALL hide approved content transport

The TypeScript native composition SHALL translate public large-content inputs and results to and from existing authenticated transfer, locator, and delivery contracts. Public callers MUST NOT receive local paths, credentials, service-instance internals, or raw transport frames.

#### Scenario: Public Topic apply contains large assets
- **WHEN** the grouped client receives a valid public Topic apply input
- **THEN** native composition stages its large assets and sends only bounded descriptors on the production control plane
- **AND** the caller observes the same semantic result as the fixed baseline

#### Scenario: Transport descriptor escapes the adapter
- **WHEN** a native result contains an internal transfer or locator descriptor
- **THEN** composition resolves or maps it to the public result contract
- **AND** it does not expose internal authority fields

### Requirement: Review commands SHALL preserve structured domain outcomes

Reference, Concept, and Topic Graph review commands SHALL preserve the fixed baseline's successful result fields and structured diagnostics. A non-commit domain outcome MUST NOT be represented as a success-shaped result without a singular diagnostic, and the Workbench SHALL continue to consume those failures through the shared diagnostic path rather than operation-specific status switches.

#### Scenario: Review command cannot commit
- **WHEN** a review target is missing, closed, invalid for the action, stale against its basis, busy, stopping, or repair-required
- **THEN** the grouped client result carries the stable structured diagnostic for that outcome
- **AND** the Workbench command is not reported as completed

#### Scenario: Review batch contains independent failures
- **WHEN** a Reference proposal decision batch contains valid decisions and one invalid or missing decision
- **THEN** successful independent decisions remain committed
- **AND** the result reports bounded applied, skipped, failed, and diagnostic fields
