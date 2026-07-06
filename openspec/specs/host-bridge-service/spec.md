# host-bridge-service Specification

## Purpose
TBD - created by archiving change introduce-host-bridge-cli-interface. Update Purpose after archive.
## Requirements
### Requirement: Host Bridge service exposes HTTP JSON v1
The system SHALL expose a plugin-owned Host Bridge HTTP JSON API under
`/bridge/v1` for local and explicitly enabled LAN clients.

#### Scenario: Health endpoint reports bridge status
- **WHEN** a client sends `GET /bridge/v1/health`
- **THEN** the bridge SHALL return service status, protocol version, host
  identity, and bind-mode metadata
- **AND** the response MUST NOT include bearer tokens or local filesystem paths.

#### Scenario: Manifest endpoint reports available bridge capabilities
- **WHEN** an authenticated client sends `GET /bridge/v1/manifest`
- **THEN** the bridge SHALL return available capability names, workflow support,
  file download support, and CLI compatibility metadata
- **AND** the response MUST NOT include bearer tokens or local filesystem paths.

### Requirement: Host Bridge service requires bearer authentication
The system SHALL require bearer-token authentication for all Host Bridge
requests except `GET /bridge/v1/health`.

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

### Requirement: Host Bridge settings expose the minimal user controls
The plugin SHALL expose only the minimal Host Bridge controls needed by normal
users.

#### Scenario: User opens Host Bridge settings
- **WHEN** the user opens the plugin settings surface
- **THEN** the Host Bridge controls SHALL include LAN enablement, token
  rotation, endpoint display, and CLI installation
- **AND** the settings surface MUST NOT expose fine-grained protocol toggles or
  a custom CLI path.

#### Scenario: User rotates the bridge token
- **WHEN** the user requests token rotation
- **THEN** the bridge SHALL generate a new bearer token
- **AND** previously issued token values SHALL no longer authorize bridge
  requests.

### Requirement: Unified listener serves Host Bridge and MCP routes

The system SHALL expose a plugin-owned Host Access HTTP listener for local and
explicitly enabled LAN clients. The Host Bridge REST API SHALL remain available
under `/bridge/v1`.

#### Scenario: Unified listener serves both protocol routes

- **WHEN** the Host Access listener is running
- **THEN** `GET /bridge/v1/health` SHALL return Host Bridge health metadata
- **AND** `POST /mcp` SHALL be routable by the same listener when MCP is enabled
- **AND** both routes SHALL use the same bound port.

#### Scenario: LAN binding exposes the unified listener

- **GIVEN** Host Bridge LAN binding is enabled
- **WHEN** Host Access starts
- **THEN** the listener SHALL bind according to the Host Bridge LAN setting
- **AND** both `/bridge/v1/*` and `/mcp` SHALL be available on that listener
- **AND** LAN mode SHALL require the configured fixed Host Bridge port.

### Requirement: Host Bridge shared bearer authentication with MCP

The system SHALL require bearer-token authentication for all Host Bridge
requests except `GET /bridge/v1/health`, and SHALL share that bearer token with
the MCP route.

#### Scenario: Shared token authorizes both protocol routes

- **GIVEN** a client has the current Host Bridge bearer token
- **WHEN** it calls authenticated `/bridge/v1/*` routes or `/mcp`
- **THEN** the same token SHALL authorize both protocol surfaces.

### Requirement: Host Bridge settings expose the minimal user controls

The plugin SHALL expose Host Access controls for LAN binding, fixed port, token
rotation, endpoint display, CLI installation, and MCP enablement without adding
a separate MCP port or LAN control.

#### Scenario: Unified settings control both protocols

- **WHEN** the user changes LAN binding or fixed-port settings
- **THEN** the Host Access listener SHALL restart using those settings
- **AND** Host Bridge and MCP endpoint metadata SHALL report the same port.

### Requirement: Host Bridge service calls broker capabilities
The system SHALL route `POST /bridge/v1/call` through JSON-safe host capability
broker APIs.

#### Scenario: Broker capability succeeds
- **WHEN** an authenticated client calls a known capability with valid JSON
  input
- **THEN** the bridge SHALL return a structured success response with the
  broker result
- **AND** the result MUST NOT include Zotero native objects, windows, `nsIFile`,
  or other host runtime objects.

#### Scenario: Unknown capability fails structurally
- **WHEN** an authenticated client calls an unknown capability
- **THEN** the bridge SHALL return a structured error with a stable error code
- **AND** no fallback to direct Zotero native APIs SHALL occur.

### Requirement: Host Bridge enforces approval policy
The Host Bridge SHALL decide approval requirements from bridge command or
capability metadata rather than trusting the CLI to decide.

#### Scenario: Read command bypasses approval
- **WHEN** an authenticated client performs a read-only action such as status,
  manifest, item search, item get, note payload retrieval, task listing, or
  workflow run status reading
- **THEN** the bridge SHALL execute the action without creating an approval
  request.

#### Scenario: Preview and download bypass approval
- **WHEN** an authenticated client performs mutation preview or downloads a
  registered file handle
- **THEN** the bridge SHALL execute the action without creating an approval
  request
- **AND** file download SHALL still require the file handle to be broker-issued
  and authorized.

#### Scenario: Workflow submit or mutation execute requires approval
- **WHEN** an authenticated client submits a workflow or executes a mutation
- **THEN** the bridge SHALL require Zotero-side approval before performing the
  operation
- **AND** the CLI MUST NOT be able to approve the operation itself.

### Requirement: Host Bridge diagnostics expose redacted operational state

Host Bridge diagnostics SHALL expose agent-usable operational summaries without leaking credentials, private paths, provider payloads, transcripts, or credential-bearing URLs.

#### Scenario: Diagnostics redact sensitive values

- **WHEN** backend diagnostics include URLs, local paths, or credential-like tokens
- **THEN** the diagnostics response SHALL redact those values before returning them to the client.

### Requirement: Host Bridge exposes read-only library readiness audit

Host Bridge SHALL expose `library.readiness_audit` as a read-only capability for
paginated Zotero library readiness inspection.

#### Scenario: Capability returns lightweight readiness DTOs

- **WHEN** `/bridge/v1/call` invokes `library.readiness_audit`
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

### Requirement: Host Bridge read capabilities bound high-cardinality responses

The Host Bridge SHALL return page-sized or otherwise explicitly bounded JSON
responses for public non-debug read capabilities that can grow with Zotero
library or Synthesis graph size.

#### Scenario: Citation graph overview is paged
- **WHEN** a client calls `citation_graph.get_overview`
- **THEN** the response SHALL include summary, diagnostics, maintenance, and
  graph hash metadata
- **AND** `nodes`, `edges`, `hover_only_nodes`, and `hover_only_edges` SHALL be
  page-sized arrays
- **AND** the response SHALL include section-level pagination metadata for each
  graph array.

#### Scenario: Large read capability remains parseable
- **WHEN** a client calls a high-cardinality read capability
- **THEN** the Host Bridge response SHALL be a complete JSON object for one
  page or bounded result
- **AND** callers SHALL be able to continue through cursor metadata when more
  results exist.

#### Scenario: Cluster queries remain selector bounded
- **WHEN** a client calls `citation_graph.query_cluster`
- **THEN** the service MAY inspect the cached graph internally
- **AND** returned nodes and edges SHALL be bounded and report truncation
  diagnostics when limits are reached.

- **WHEN** readiness evidence is returned
- **THEN** it SHALL NOT include local private paths, transcript text, backend
  private payloads, or decoded note payload bodies.

