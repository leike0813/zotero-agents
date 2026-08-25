## MODIFIED Requirements

### Requirement: Host API is the broker SSOT

The system SHALL treat `ZoteroHostCapabilityBroker` as the canonical owner of JSON-safe Zotero context, navigation, library, metadata, and controlled mutation capabilities. `WorkflowHostApi` SHALL remain the workflow compatibility interface and SHALL expose broker capabilities only through an explicit projection. Host Bridge SHALL consume the canonical broker directly, and MCP SHALL consume the Host Bridge capability mirror.

#### Scenario: A new Zotero capability is added

- **WHEN** a future change adds a Zotero capability intended for workflow package, Host Bridge, CLI, or MCP use
- **THEN** its canonical DTOs and operation signature SHALL be owned by the Zotero Host Capability Broker
- **AND** its workflow exposure SHALL require an explicit `WorkflowHostApi` projection decision
- **AND** its Host Bridge or MCP exposure SHALL require the applicable permission and locality adapter decision.

#### Scenario: Workflow package needs read-only metadata translation

- **WHEN** a workflow package needs Zotero Translate Search metadata for a stable identifier
- **THEN** it SHALL request the lookup through `runtime.hostApi.metadata`
- **AND** the workflow projection SHALL delegate to the canonical broker capability
- **AND** it SHALL NOT require raw `runtime.zotero` access under the package host-api contract.

### Requirement: Workflow Host API version consumers SHALL recognize v11

All package runtime guards, loader globals, capability summaries, debug probes, tests, and SSOT documentation that declare the supported Workflow Host API version SHALL be synchronized to version 11.

#### Scenario: Built-in package consumes Host API v11

- **WHEN** a precompiled built-in workflow hook resolves its runtime Host API
- **THEN** version 11 SHALL pass the package runtime compatibility guard
- **AND** versions outside the declared supported range SHALL continue to fail deterministically.

#### Scenario: Built-in package consumes Host API v8

- **WHEN** a precompiled built-in workflow hook that still requires Host API v8 resolves its runtime Host API
- **THEN** the v11 runtime SHALL reject that stale compatibility guard deterministically
- **AND** the package SHALL need to declare the current v11 contract before it can run.

## RENAMED Requirements

- FROM: `### Requirement: Workflow Host API version consumers SHALL recognize v8`
- TO: `### Requirement: Workflow Host API version consumers SHALL recognize v11`
- FROM: `### Requirement: Workflow Host API v8 current view SHALL identify a real selected collection`
- TO: `### Requirement: Workflow Host API v11 current view SHALL identify a real selected collection`

## ADDED Requirements

### Requirement: Workflow broker projection is explicit and closed

`WorkflowHostApi` SHALL expose only the broker members declared by its public v11 contract. Adding a canonical broker member SHALL NOT implicitly add it to the workflow interface.

#### Scenario: Broker gains a new member

- **WHEN** a capability family gains a new broker operation
- **THEN** existing workflow host objects SHALL not expose that operation unless the workflow projection is explicitly updated
- **AND** runtime workflow objects SHALL not contain undeclared broker members.
