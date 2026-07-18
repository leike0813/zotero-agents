## ADDED Requirements

### Requirement: Workbench reads are grouped and region-scoped
`SynthesisClient` SHALL expose chrome, surface, Topic detail, and paper digest reads through a `workbench` capability and SHALL NOT expose the legacy full snapshot through that capability.

#### Scenario: Chrome and active surface are read
- **WHEN** a Workbench consumer requests initial chrome and active-surface input
- **THEN** it SHALL invoke `workbench.readChrome` and `workbench.readSurface` separately
- **AND** it SHALL NOT invoke `getSynthesisSnapshot`

#### Scenario: Topic detail and paper digest are read
- **WHEN** the read-only Workbench opens a Topic or one of its paper digests
- **THEN** it SHALL invoke the corresponding narrow Workbench client method with stable identifiers

### Requirement: Workbench contracts are environment-neutral
Workbench client requests and results SHALL be JSON-safe, SHALL use the contract-owned Workbench surface union, and SHALL NOT include plugin UI classes, host objects, functions, absolute paths, or legacy service-derived public types.

#### Scenario: Contract package is checked
- **WHEN** the independent contracts typecheck and environment-neutrality guard run
- **THEN** all four Workbench methods SHALL compile without DOM, Zotero, Node, or plugin implementation imports

#### Scenario: Invalid runtime request crosses the boundary
- **WHEN** a Workbench request contains a function, cyclic object, or host-class instance
- **THEN** the in-process client SHALL reject it with a stable `invalid_request` client error before invoking the legacy port

### Requirement: The read-only harness consumes the client
The Synthesis read-only harness SHALL return `SynthesisClient` plus an explicit close operation and SHALL route its four service-backed UI reads only through `client.workbench`.

#### Scenario: Read-only UI harness starts
- **WHEN** valid Zotero, plugin, and Synthesis databases are available
- **THEN** the harness SHALL compose a client over read-only adapters
- **AND** existing UI chrome, surface, Topic detail, and digest results SHALL remain observable-compatible

#### Scenario: Harness resource initialization fails
- **WHEN** client composition fails after a read-only adapter has opened
- **THEN** every opened adapter SHALL be closed before the failure is returned

#### Scenario: A mutation action is received
- **WHEN** the UI harness receives an apply, delete, rebuild, refresh, import, or other mutation command
- **THEN** it SHALL continue to mock or reject the action without routing it to the Synthesis client

### Requirement: Legacy service composition has one direct owner
Only the declared migration-time legacy composition module SHALL import or create the complete Synthesis service for client adapters.

#### Scenario: Direct consumers are checked
- **WHEN** the Synthesis service boundary checker scans production and harness sources
- **THEN** the direct-consumer inventory SHALL contain exactly legacy composition, production Workbench, Host Bridge, and MCP
- **AND** default client and read-only harness modules SHALL not appear as direct consumers

### Requirement: Existing ownership and failures are preserved
The migration-time in-process adapter SHALL preserve current query behavior, stable client error mapping, and current database, canonical file, mirror, and Zotero ownership.

#### Scenario: A legacy query throws
- **WHEN** a Workbench legacy port throws an ordinary error
- **THEN** the client SHALL reject with `SynthesisClientError` code `internal`
- **AND** it SHALL not retry the request

#### Scenario: Read-only client is used
- **WHEN** the harness completes any declared Workbench read
- **THEN** no Synthesis or Zotero write SHALL be introduced by this change
