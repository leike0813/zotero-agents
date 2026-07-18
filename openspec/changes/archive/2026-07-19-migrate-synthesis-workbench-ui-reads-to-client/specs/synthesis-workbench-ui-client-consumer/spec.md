## ADDED Requirements

### Requirement: Production Workbench UI reads use the client
The production Synthesis Workbench SHALL route chrome, surface, Topic detail, and paper digest UI reads through `SynthesisClient.workbench` and SHALL NOT invoke the corresponding legacy service read methods.

#### Scenario: Workbench chrome and surface render
- **WHEN** the production Workbench loads chrome or refreshes any supported surface
- **THEN** it SHALL invoke the corresponding region-scoped client read
- **AND** it SHALL NOT request a full Synthesis snapshot

#### Scenario: Topic and digest details render
- **WHEN** the production Workbench opens, exports, or refreshes client-backed Topic detail or paper digest data
- **THEN** it SHALL use stable identifiers with the corresponding client read

### Requirement: Workbench UI transport conversion has one owner
Production Workbench and read-only harness consumers SHALL share one adapter for UI state, snapshot projection, and digest DTO conversion.

#### Scenario: UI read state crosses the client boundary
- **WHEN** either Workbench consumer issues a client read
- **THEN** plugin UI state SHALL be converted to JSON-safe read state by the shared adapter

#### Scenario: A digest result is rendered
- **WHEN** either Workbench consumer receives a digest result using supported snake-case or camel-case fields
- **THEN** the shared adapter SHALL produce the existing UI digest contract shape

### Requirement: Region identity and stale-read behavior are preserved
The production Workbench SHALL retain its existing surface request identity, active-surface and latest-request guards, dirty and loaded state, last-known-good snapshots, message structure, and merge order after client migration.

#### Scenario: A stale surface read completes
- **WHEN** a surface read completes after a newer request or active-surface selection supersedes it
- **THEN** the stale result SHALL NOT replace the active region projection

#### Scenario: A transcript-independent region refreshes
- **WHEN** one Workbench region receives a new client projection
- **THEN** unrelated managed region identity SHALL remain governed by its own stable signature

### Requirement: Storage busy remains transient across the client
The in-process Synthesis client SHALL map SQLite busy failures to stable error code `storage_busy` before applying ordinary internal-error normalization.

#### Scenario: SQLite rejects a Workbench read as busy
- **WHEN** a client-backed Workbench read fails with the recognized SQLite busy error
- **THEN** the client SHALL reject with `SynthesisClientError` code `storage_busy`
- **AND** the Workbench SHALL publish the existing transient surface error semantics

### Requirement: Command-plane scope remains unchanged
Commands, prewarm phased callbacks, progress polling, report reads, options, mutations, Host Bridge, and MCP SHALL remain outside this consumer-only UI read migration.

#### Scenario: Legacy consumer inventory is checked
- **WHEN** the Synthesis service boundary guard runs after the UI read migration
- **THEN** the direct-consumer allowlist SHALL remain exactly legacy composition, production Workbench, Host Bridge, and MCP
- **AND** the four migrated UI read methods SHALL be forbidden from the production Workbench legacy service path
