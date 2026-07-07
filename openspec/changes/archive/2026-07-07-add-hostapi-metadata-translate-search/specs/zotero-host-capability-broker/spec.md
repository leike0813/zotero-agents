## MODIFIED Requirements

### Requirement: Host API is the broker SSOT

The system SHALL treat `hostApi` and its broker-owned modules as the
forward-facing Host Capability Broker for workflow package code, Host Bridge
service endpoints, CLI access through the Host Bridge, and MCP tool backends.

#### Scenario: A new Zotero capability is added

- **WHEN** a future change adds a Zotero capability intended for workflow
  package, Host Bridge, CLI, or MCP use
- **THEN** the capability SHOULD be modeled through `hostApi` or a broker
  module owned by `hostApi`
- **AND** direct exposure of Zotero native objects SHOULD be avoided at external
  boundaries.

#### Scenario: Workflow package needs read-only metadata translation

- **WHEN** a workflow package needs Zotero Translate Search metadata for a stable identifier
- **THEN** it SHALL request the lookup through `runtime.hostApi.metadata`
- **AND** it SHALL NOT require raw `runtime.zotero` access under the package host-api contract.
