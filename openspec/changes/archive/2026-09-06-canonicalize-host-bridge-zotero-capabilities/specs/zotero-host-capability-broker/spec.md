## MODIFIED Requirements

### Requirement: Broker SHALL own canonical mutation admission and evidence

The Broker SHALL durably bind caller scope and operationId to the operation kind and normalized semantic digest before any Host effect. It SHALL retain terminal receipts and attempts across restart, resolve identical identities without another effect, and retain permanent identity protection after ordinary evidence expires. Current-process promises SHALL coordinate live execution only; public observation SHALL expose only running, settled with result, or unavailable and SHALL NOT expose storage records.

#### Scenario: Same operation is replayed with the same request

- **WHEN** a caller repeats an accepted operationId with the same canonical request, including after restart
- **THEN** the Broker returns or waits for the original outcome without executing a second write
- **AND** expired ordinary evidence returns outcome_unavailable while the identity remains protected.

#### Scenario: Same operation identity carries different input

- **WHEN** a caller reuses an accepted operationId with a different canonical request digest
- **THEN** the Broker returns a conflict with reason idempotency_conflict before another write begins.

## REMOVED Requirements

### Requirement: Handlers are internal mutation primitives

## ADDED Requirements

### Requirement: Canonical Broker owns private mutation effects

The system SHALL not expose, document, or retain handlers as a public write-oriented DSL. The Broker SHALL own canonical mutation semantics and may use narrowly scoped private native-effect helpers internally. Private helpers SHALL not define public operation names, request/result DTOs, Workflow Host members, Bridge capabilities, MCP tools, or result-apply contracts.

#### Scenario: A canonical mutation needs native work
- **WHEN** the Broker performs a canonical mutation
- **THEN** it MAY call private native-effect helpers within the Broker implementation
- **AND** callers SHALL enter only through the named canonical Broker operation.

#### Scenario: A former handler-shaped entry point is requested
- **WHEN** a workflow, Bridge, MCP, CLI, or result-apply consumer requests a former handlers operation
- **THEN** the public boundary SHALL reject it as unsupported
- **AND** it SHALL not adapt the request to a private helper.

### Requirement: Broker owns mutation authority and observation

The system SHALL treat ZoteroHostCapabilityBroker as the canonical owner of JSON-safe Zotero context, navigation, library, metadata, controlled mutation, durable mutation evidence, and read-only mutation observation. WorkflowHostApi SHALL expose broker capabilities only through explicit projection. Host Bridge SHALL consume the canonical broker directly, and MCP SHALL consume the Host Bridge capability mirror.

#### Scenario: A caller observes a mutation
- **WHEN** a trusted adapter needs the state of a canonical operation identity
- **THEN** it SHALL call the Broker read-only mutation observation
- **AND** it SHALL not use generic HTTP operation history or re-execute a mutation.
