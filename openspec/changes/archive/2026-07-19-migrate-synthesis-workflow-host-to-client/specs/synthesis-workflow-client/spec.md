## ADDED Requirements

### Requirement: Workflow Synthesis exposure is narrow
`WorkflowHostApi.synthesis` SHALL expose only the twelve declared workflow methods and SHALL NOT expose the full `SynthesisService` or `SynthesisClient`.

#### Scenario: Workflow host is created
- **WHEN** the plugin creates a workflow host API
- **THEN** its Synthesis facade SHALL contain the declared apply, Topic report, paper artifact, Tag Vocabulary, staging, and audit methods
- **AND** unrelated repository, Workbench, debug, sync, and lifecycle methods SHALL be absent

### Requirement: Workflow methods route through grouped client capabilities
The workflow facade SHALL lazily resolve `SynthesisClient` and route each method to its domain capability without importing the legacy service.

#### Scenario: Workflow command executes
- **WHEN** a workflow invokes a Synthesis facade method
- **THEN** the corresponding grouped client method SHALL receive the request
- **AND** the observable result SHALL be returned unchanged except for the existing bounded invalidation side effect

#### Scenario: Direct legacy consumers are checked
- **WHEN** the boundary checker scans production sources
- **THEN** workflow host and workflow types SHALL be absent from the direct legacy consumer inventory
- **AND** the total direct consumer count SHALL be five

### Requirement: Digest apply receives a JSON-safe item snapshot
The plugin SHALL convert any live Zotero item used by digest apply into an explicit environment-neutral item snapshot before invoking the client.

#### Scenario: Digest workflow passes a parent item
- **WHEN** the workflow submits a live parent item
- **THEN** the client request SHALL contain its bounded identity, bibliographic, tag, collection, and identifier fields
- **AND** it SHALL NOT contain the live item or callable members

### Requirement: Topic apply materializes controlled assets
The plugin SHALL resolve Topic apply run-workspace files before the client boundary and SHALL replace local locators with deterministic controlled asset identifiers.

#### Scenario: Relative bundle paths are submitted
- **WHEN** Topic apply references relative files through a bundle reader
- **THEN** the plugin SHALL read the referenced files, rewrite bundle/manifest locators to controlled asset IDs, and submit JSON-safe asset texts

#### Scenario: ACP absolute paths are submitted
- **WHEN** result context resolves absolute ACP artifact paths
- **THEN** those paths SHALL be consumed only by the plugin-side resolver
- **AND** no absolute path SHALL appear in the client request

#### Scenario: Asset input is invalid or unbounded
- **WHEN** a referenced asset is missing, a manifest is invalid, the count exceeds 256, one asset exceeds 5 MiB, or aggregate text exceeds 50 MiB
- **THEN** the call SHALL fail with stable `invalid_request` details before the legacy mutation is invoked

### Requirement: In-process adapter preserves current workflow behavior
The migration-time adapter SHALL reconstruct read-only asset access and delegate to the current in-process implementation without changing DB, canonical file, mirror, or Zotero ownership.

#### Scenario: Topic apply reaches the legacy implementation
- **WHEN** a materialized Topic request is routed through the in-process client
- **THEN** the legacy implementation SHALL read only the supplied controlled assets
- **AND** current persisted, conflict, missing, duplicate, and validation results SHALL remain observable-compatible

### Requirement: Workflow contracts are environment-neutral
Workflow client DTOs SHALL be package-owned, JSON-safe, bounded where collections or assets cross the boundary, and free of repository rows, absolute paths, host objects, functions, and legacy service-derived types.

#### Scenario: Contract boundary is checked
- **WHEN** contract and boundary checks run
- **THEN** forbidden imports and non-environment-neutral workflow shapes SHALL fail validation

### Requirement: Active documentation describes the narrow current API
Current workflow API documentation SHALL identify `WorkflowSynthesisApi`, list the supported methods, and state that the default implementation is still in-process.

#### Scenario: Workflow API docs are generated
- **WHEN** documentation consistency checks run
- **THEN** active source and generated workflow host documentation SHALL no longer advertise `SynthesisService`
