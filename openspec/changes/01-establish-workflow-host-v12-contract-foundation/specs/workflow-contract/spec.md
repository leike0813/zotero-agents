## ADDED Requirements

### Requirement: Workflow Host public data SHALL use a closed portable value model
Workflow Host and Broker public DTOs SHALL be composed from finite strict-JSON values and canonical portable references. The only non-JSON values permitted at the trusted in-process seam SHALL be `AbortSignal`, declared callbacks, editor DOM values, byte arrays, and trusted local path values explicitly named by the v12 contract.

#### Scenario: Portable item reference is accepted
- **WHEN** a caller supplies a positive finite `libraryId` and canonical Zotero item key
- **THEN** the contract accepts the portable item reference without requiring a numeric item ID or raw Zotero object

#### Scenario: Native object reaches a public DTO
- **WHEN** a public DTO contains a Zotero object, Window, native stream, filesystem adapter, non-finite number, or undeclared binary value
- **THEN** validation fails with a stable coded error before the value crosses the public seam

### Requirement: Workflow Host errors SHALL use one closed public taxonomy
Every Workflow Host owner SHALL expose failures through the eleven-code `zotero-agents.workflow-host-error.v1` contract with code-specific strict-JSON details. Callers MUST NOT branch on error prose, class name, stack, provider identity, or backend product name.

#### Scenario: Missing referenced object
- **WHEN** a valid portable reference resolves to no current object
- **THEN** the failure uses `not_found` with a closed target kind and no raw reference or native cause

#### Scenario: Non-interactive adapter denies UI
- **WHEN** a non-interactive adapter receives a UI-dependent call
- **THEN** the failure uses `interaction_required` and names only the closed member identity

### Requirement: Cancelable calls SHALL use a separate trusted control parameter
Potentially blocking Workflow Host calls with real cancellation points SHALL accept `WorkflowCallControl` separately from their JSON request DTO. Callback-scoped calls SHALL require the control parameter and SHALL execute callbacks serially.

#### Scenario: Caller aborts before publication
- **WHEN** the execution signal is aborted before a cancelable owner publishes a result
- **THEN** the owner does not publish a late success and reports cancellation through the contractually permitted channel

### Requirement: Contract variants SHALL retain one exact shape
Interactive and non-interactive Workflow Host variants SHALL expose the same exact top-level and nested member identities. Availability or interaction policy MUST be represented by results or coded failures, never by missing optional members, spreads, proxies, or a runtime capability catalog.

#### Scenario: Variant conformance is inspected
- **WHEN** both current contract variants are recursively inspected
- **THEN** their member identities and function positions are identical even though UI-dependent execution behavior differs

#### Scenario: Foundation is implemented before activation
- **WHEN** this foundation change is complete but final v12 activation has not run
- **THEN** the production projection still reports the current v11 identity and does not expose a partial v12 surface
