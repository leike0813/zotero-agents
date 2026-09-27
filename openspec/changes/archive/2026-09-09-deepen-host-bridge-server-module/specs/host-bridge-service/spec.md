## MODIFIED Requirements

### Requirement: Host Bridge service requires bearer authentication
The system SHALL require bearer-token authentication for all Host Bridge
requests except `GET /bridge/v2/health`.

#### Scenario: Missing token is rejected
- **WHEN** a client sends a non-health bridge request without
  `Authorization: Bearer <token>`
- **THEN** the bridge SHALL return a structured unauthorized error
- **AND** the requested capability, workflow action, or file download MUST NOT
  execute.

#### Scenario: LAN binding is disabled by default
- **WHEN** the Host Bridge starts with default settings
- **THEN** it SHALL bind only to loopback
- **AND** LAN binding SHALL require an explicit plugin setting.

### Requirement: Unified listener serves Host Bridge and MCP routes

The system SHALL expose a plugin-owned Host Access HTTP listener for local and
explicitly enabled LAN clients. The Host Bridge REST API SHALL remain available
under `/bridge/v1`.

#### Scenario: Unified listener serves both protocol routes

- **WHEN** the Host Access listener is running
- **THEN** `GET /bridge/v2/health` SHALL return Host Bridge health metadata
- **AND** `POST /mcp` SHALL be routable by the same listener when MCP is enabled
- **AND** both routes SHALL use the same bound port.

#### Scenario: LAN binding exposes the unified listener

- **GIVEN** Host Bridge LAN binding is enabled
- **WHEN** Host Access starts
- **THEN** the listener SHALL bind according to the Host Bridge LAN setting
- **AND** both `/bridge/v2/*` and `/mcp` SHALL be available on that listener
- **AND** LAN mode SHALL require the configured fixed Host Bridge port.

### Requirement: Host Bridge shared bearer authentication with MCP

The system SHALL require bearer-token authentication for all Host Bridge
requests except `GET /bridge/v2/health`, and SHALL share that bearer token with
the MCP route.

#### Scenario: Shared token authorizes both protocol routes

- **GIVEN** a client has the current Host Bridge bearer token
- **WHEN** it calls authenticated `/bridge/v2/*` routes or `/mcp`
- **THEN** the same token SHALL authorize both protocol surfaces.

### Requirement: Host Bridge exposes read-only library readiness audit

Host Bridge SHALL expose `library.readiness_audit` as a read-only capability for
paginated Zotero library readiness inspection.

#### Scenario: Capability returns lightweight readiness DTOs

- **WHEN** `/bridge/v2/call` invokes `library.readiness_audit`
- **THEN** Host Bridge SHALL return `zotero.library.readiness_audit.v1`
- **AND** each item SHALL include a compact Zotero item summary, readiness
  states for `pdf`, `markdown`, and `analysis`, a `missing` array, and
  redacted evidence.
- **AND** generated analysis readiness SHALL use the same shared artifact classifier as the Zotero Library Artifacts column, including the embedded-payload fallback for marker-missing generated notes.
- **AND** results SHALL use the same filter, cursor, and limit behavior as the
  existing library list and snapshot capabilities.

#### Scenario: Capability is read-only

- **WHEN** Host Bridge handles `library.readiness_audit`
- **THEN** it SHALL NOT mutate Zotero data, execute workflows, register file
  downloads, invalidate caches, or require Zotero UI approval.

#### Scenario: Evidence is redacted

