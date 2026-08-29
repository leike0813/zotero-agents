# synthesis-client-contracts Specification

## Purpose
Defines the Synthesis clients contract, specifying the data exchange format, validation rules, and integration boundaries.

## Requirements

### Requirement: Contracts are environment-neutral and independently checked

The Synthesis contracts package SHALL compile without Node, DOM, Zotero, plugin toolkit, repository, filesystem, or transport implementation dependencies.

#### Scenario: Forbidden dependency is introduced
- **WHEN** contract source imports an environment-specific or implementation module
- **THEN** the contract boundary check SHALL fail

#### Scenario: Plugin build is validated
- **WHEN** the project typecheck or production build runs
- **THEN** the contracts package SHALL be independently typechecked as part of that gate

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

### Requirement: Client errors have stable control-flow codes

Client implementations SHALL reject failures as `SynthesisClientError` values with stable codes and JSON-safe diagnostic details, while human-readable messages remain non-authoritative.

#### Scenario: Legacy implementation throws an ordinary error
- **WHEN** the in-process adapter receives a non-client exception
- **THEN** it SHALL reject with the stable `internal` code
- **AND** diagnostic details SHALL remain JSON-safe

#### Scenario: Client error crosses an adapter
- **WHEN** the legacy port throws an existing `SynthesisClientError`
- **THEN** the adapter SHALL preserve its stable code and structured details

### Requirement: Legacy composition is isolated behind a narrow port

The migration-time in-process client SHALL depend on narrow legacy capability ports, and only its default composition module SHALL resolve the full default Synthesis service.

#### Scenario: Workflow option consumer resolves its dependency
- **WHEN** workflow parameter options need Topic choices without an injected client
- **THEN** the consumer SHALL resolve the default `SynthesisClient`
- **AND** it SHALL NOT import the legacy Synthesis service

#### Scenario: Direct legacy consumer grows
- **WHEN** production code adds another import or resolver for the full legacy service outside the recorded composition allowlist
- **THEN** the service boundary check SHALL fail

### Requirement: Production behavior remains in-process during foundation migration

The default client SHALL delegate to the current in-process service and SHALL NOT change Synthesis DB, canonical file, mirror, or Zotero ownership.

#### Scenario: Default Topic option query executes
- **WHEN** the plugin uses the default Synthesis client
- **THEN** the query SHALL execute against the current in-process service through the adapter
- **AND** no remote runtime SHALL be required

### Requirement: Observation contracts SHALL be strict and payload-free

The v2 rebuilder SHALL reject unknown fields, free error text, raw locators,
paths, credentials, and identifiers outside closed identity/fact/metric keys.
Zero-valued allowlisted metrics and facts SHALL be preserved.

#### Scenario: Unknown detail is supplied
- **WHEN** an event contains a title or arbitrary detail key
- **THEN** rebuilding fails closed

### Requirement: Production client ports SHALL expose concrete operation types

Every production `SynthesisClient` operation SHALL expose its operation-specific request and result types through the grouped client, neutral port, native adapter, and test harness. Production paths MUST NOT use `Promise<unknown>`, a legacy JSON port, or an untyped domain container.

#### Scenario: Production client inventory is type-checked
- **WHEN** the contract and production-capability gates inspect all 96 production operations
- **THEN** each method resolves through its concrete request and result mapping
- **AND** no production method reaches a legacy or unknown bridge

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
