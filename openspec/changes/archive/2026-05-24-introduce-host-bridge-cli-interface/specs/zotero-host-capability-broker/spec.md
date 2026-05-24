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

### Requirement: MCP tools use JSON-safe broker adapters

The system SHALL expose Zotero MCP tools as JSON-safe adapters over broker
capabilities rather than direct exports of `handlers` or Zotero native APIs.
MCP SHALL be treated as a compatibility adapter over broker capabilities, not
as the primary host capability source.

#### Scenario: Agent calls a Zotero MCP tool

- **WHEN** an MCP client invokes a Zotero tool
- **THEN** the tool response MUST be serializable JSON-compatible data
- **AND** the response MUST NOT contain `Zotero.Item`, `Zotero.Collection`,
  window, `nsIFile`, or other host runtime objects
- **AND** the tool contract MUST be named around an agent task rather than an
  internal handler method.

## ADDED Requirements

### Requirement: MCP adapter is deprecated after Host Bridge CLI completion

After Host Bridge CLI is fully implemented and stable, the system SHALL keep
MCP capabilities and code available for compatibility while removing MCP from
the default ACP host access path.

#### Scenario: ACP run starts after MCP deprecation

- **WHEN** an ACP agent run starts after Host Bridge CLI is the stable host
  access path
- **THEN** the plugin SHALL NOT start MCP by default
- **AND** it SHALL NOT inject MCP descriptors into the agent run by default
- **AND** it SHALL NOT run MCP preflight as part of normal ACP run preparation.

#### Scenario: ACP UI is shown after MCP deprecation

- **WHEN** the ACP panel renders host access state after MCP deprecation
- **THEN** it SHALL NOT show the MCP status indicator as part of the normal run
  status surface
- **AND** MCP diagnostics MAY remain available through explicit developer or
  compatibility tooling.
