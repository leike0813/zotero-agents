# host-bridge-service Specification

## Purpose
TBD - created by archiving change introduce-host-bridge-cli-interface. Update Purpose after archive.

## Requirements

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

### Requirement: Unified Host Access settings control both protocol surfaces

The plugin SHALL expose Host Access controls for LAN binding, fixed port, token
rotation, endpoint display, CLI installation, and MCP enablement without adding
a separate MCP port or LAN control.

#### Scenario: Unified settings control both protocols

- **WHEN** the user changes LAN binding or fixed-port settings
- **THEN** the Host Access listener SHALL restart using those settings
- **AND** Host Bridge and MCP endpoint metadata SHALL report the same port.

### Requirement: Host Bridge service calls broker capabilities

The system SHALL route Bridge calls through JSON-safe Host Capability Broker APIs. Canonical mutation transport SHALL expose effect-free mutation.preview and mutation.execute for each of the closed 23-operation canonical mutation union, plus read-only mutation.get_operation. MCP SHALL mirror the same Bridge definition and handler. Mutation execution and observation SHALL use the Broker durable caller namespace, independent of generic HTTP request IDs, transient connections, and X-Zotero-Bridge-Scope. mutation.get_operation SHALL expose only running, settled(result), or unavailable; it SHALL not expose request payloads, timestamps, scope, or identity-binding details. No Bridge route SHALL fall back to legacy mutations, direct Zotero APIs, public prepared tokens, or generic HTTP operation history.

#### Scenario: Canonical mutation is observed
- **WHEN** an authenticated Bridge or MCP client calls mutation.get_operation
- **THEN** the Bridge SHALL invoke the Broker read-only observation
- **AND** it SHALL not execute, retry, or query generic HTTP operation history.

#### Scenario: Broker capability succeeds
- **WHEN** an authenticated client calls a known capability with valid JSON input
- **THEN** the bridge SHALL return a structured success response with the Broker result
- **AND** it SHALL not expose native Host objects, local paths, public tokens, or caller revisions.

#### Scenario: Unknown capability fails structurally
- **WHEN** an authenticated client calls an unknown capability
- **THEN** the bridge SHALL return a structured error with a stable error code
- **AND** no fallback to direct Zotero native APIs SHALL occur.

### Requirement: Host Bridge enforces approval policy

The Host Bridge SHALL derive approval requirements from capability metadata. mutation.preview and mutation.get_operation bypass approval. mutation.execute SHALL perform canonical validation and private preflight before approval, and SHALL reevaluate after approval. A changed prepared-plan digest SHALL require a new approval.

#### Scenario: Plan changes while approval waits
- **WHEN** post-approval reevaluation produces a different domain plan digest
- **THEN** the original approval SHALL not authorize execution
- **AND** the Bridge SHALL request approval for the newly prepared scope.

#### Scenario: Read command bypasses approval
- **WHEN** an authenticated client performs a read-only action including mutation preview or mutation observation
- **THEN** the bridge SHALL execute it without creating an approval request.

#### Scenario: Preview and download bypass approval
- **WHEN** an authenticated client performs mutation preview or downloads a registered file handle
- **THEN** the bridge SHALL execute it without approval
- **AND** file download SHALL still require a valid authorized handle.

#### Scenario: Workflow submit or mutation execute requires approval
- **WHEN** an authenticated client submits a workflow or executes a mutation
- **THEN** the bridge SHALL require Zotero-side approval before the effect
- **AND** the CLI SHALL not approve the operation itself.

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

### Requirement: Host Bridge library reads share opaque keyset pagination

Host Bridge SHALL route `library.list_items`, `library.sync_snapshot`, `library.readiness_audit`, and `library.search_items` through the shared Zotero library page-query contract.

#### Scenario: Host Bridge returns a library page

- **WHEN** a client calls a paginated library capability
- **THEN** the result SHALL preserve the capability's bounded DTO shape and current-condition total count
- **AND** any `nextCursor` SHALL be an opaque string bound to the normalized criteria.

#### Scenario: Host Bridge receives an invalid cursor

- **WHEN** a library capability receives a malformed, unsupported, criteria-mismatched, or numeric cursor
- **THEN** Host Bridge SHALL return structured code `invalid_library_cursor`
- **AND** the error SHALL be non-retryable without corrected input.

### Requirement: Host Bridge SHALL derive locality from trusted transport context
Host Bridge SHALL derive effective local or remote mode from the accepted socket peer and listener, not from a client-controlled header.

#### Scenario: Remote peer declares local
- **WHEN** a non-loopback or unknown peer declares local connection mode
- **THEN** Host Bridge SHALL treat the request as remote.

#### Scenario: Local peer requests remote behavior
- **WHEN** a loopback peer explicitly declares remote mode
- **THEN** Host Bridge SHALL use the more restrictive remote behavior.

#### Scenario: Trusted peer information is unavailable
- **WHEN** peer locality cannot be established
- **THEN** Host Bridge SHALL fail closed to remote delivery semantics.

### Requirement: Host Bridge service SHALL route workflow queue and submission resources
The authenticated HTTP v1 service SHALL route pending queue list/cancel and active submission inspection through the workflow control module.

#### Scenario: Authenticated queue request
- **WHEN** a bearer-authenticated client calls a workflow queue or submission route
- **THEN** the service SHALL parse only declared filters/body fields and return the workflow-control result envelope

#### Scenario: Unauthenticated queue request
- **WHEN** a caller omits or fails bearer authentication
- **THEN** the service SHALL reject the request before reading or mutating queue state

### Requirement: Host Bridge SHALL expose executable capability contracts under protocol v2
The Host Bridge SHALL expose `/bridge/v2`, advertise `host-bridge.v2`, and use one canonical capability contract as the runtime source for capability input Schema, output Schema, effect, and approval policy.

#### Scenario: Valid capability call crosses every contract boundary
- **WHEN** an authenticated client calls a registered capability with valid input
- **THEN** Host Bridge SHALL validate input before permission evaluation
- **AND** SHALL resolve effect and approval policy from the capability contract
- **AND** SHALL validate the handler result before returning success.

#### Scenario: Input is invalid
- **WHEN** capability input is missing a required field, has the wrong type, or contains an undeclared field
- **THEN** Host Bridge SHALL return `invalid_capability_input`
- **AND** SHALL NOT request permission, invoke the handler, mutate state, or consume a handle.

#### Scenario: Handler output violates the contract
- **WHEN** a handler returns data that does not satisfy its declared output Schema
- **THEN** Host Bridge SHALL return `capability_output_contract_violation`
- **AND** SHALL NOT represent the result as a successful capability call.

### Requirement: Host Bridge capability registration SHALL be closed
The registered handler IDs and canonical capability IDs SHALL be identical, and handlers SHALL be invocable only through the validating dispatcher.

#### Scenario: Registry and contract differ
- **WHEN** a capability or handler is missing, duplicated, or orphaned
- **THEN** Host Bridge startup and contract validation SHALL fail before serving requests.

### Requirement: Ordinary library capabilities SHALL consume canonical Broker pages
Ordinary library/item/note/payload/attachment/annotation handlers SHALL use the canonical Broker directly with trusted request control. They SHALL NOT resolve partial ordinary-read projections, invoke legacy read fallbacks, or materialize complete collections to repaginate. Missing or incomplete injected capabilities SHALL fail closed.

#### Scenario: Injected read capability is absent
- **WHEN** an ordinary library capability is not configured
- **THEN** the call fails without entering a default native fallback.

### Requirement: Host Bridge SHALL expose Saved Search discovery
Host Bridge SHALL expose library.list_saved_searches as read-only portable-ref discovery with the Broker-owned input and page semantics.

#### Scenario: Discovery is called remotely
- **WHEN** an authenticated client requests a Saved Search page
- **THEN** it receives stable refs and display names without navigation effects.
