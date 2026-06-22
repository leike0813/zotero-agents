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

