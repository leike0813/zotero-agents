# synthesis-workbench-ui-client-consumer Specification

## Purpose
Defines the Synthesis Workbench client consumer contract for ui operations, specifying how Workbench reads and reacts to client-side state changes.

## Requirements

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

Production Workbench and read-only harness consumers SHALL share one adapter for UI state, per-surface snapshot projection, and digest DTO conversion. The adapter SHALL project local UI state into the protocol-owned Workbench read state, SHALL accept every contract-owned surface projection, and SHALL NOT forward unrelated local UI fields across the client boundary.

#### Scenario: UI read state crosses the client boundary
- **WHEN** either Workbench consumer issues a Chrome or surface read
- **THEN** the shared adapter SHALL project plugin UI state into the closed registry, reviews, reader, and Graph query sections of the Workbench read state
- **AND** local artifacts, tags, drawer, selection, selected-tab, and other presentation-only state SHALL NOT enter the request

#### Scenario: Graph continuation is projected
- **WHEN** the Graph surface requests another window against an expected graph basis
- **THEN** the shared adapter SHALL preserve the current Graph filters and layout algorithm
- **AND** it SHALL place the window cursor and expected graph hash in the canonical Graph query fields

#### Scenario: A digest result is rendered
- **WHEN** either Workbench consumer receives a digest result using supported snake-case or camel-case fields
- **THEN** the shared adapter SHALL produce the existing UI digest contract shape

#### Scenario: Every surface result is rendered

- **WHEN** the client returns a valid projection for any supported surface or Review tab
- **THEN** the shared adapter SHALL convert that projection to the existing UI snapshot input
- **AND** Topic Graph, Concept, Tag, Citation Graph, Reference registry, and Reader data SHALL remain available to their owning UI regions

#### Scenario: Historical Topic and persisted Review data are rendered

- **WHEN** the client returns lightweight historical-safe Topic rows or non-empty closed Review rows
- **THEN** the shared adapter SHALL populate the existing Home, Topics, and active Review UI regions
- **AND** rendering SHALL NOT depend on a full persistence bundle or opaque proposal payload

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

### Requirement: Expanded Index rows SHALL participate in virtual scrolling

Parent and expanded reference rows SHALL use stable identities in one measured virtual window. Scrolling, incremental hydration, and appending batches SHALL preserve visible content, focused row identity, and the visible scroll anchor while keeping rendered row count bounded.

#### Scenario: Scroll through an expanded reference block
- **WHEN** a parent has more references than fit in the viewport
- **THEN** scrolling within that block continues to display its visible reference rows
- **AND** offscreen reference rows do not remain fully mounted

### Requirement: Index SHALL reuse bounded session data

Within one Zotero session, Index SHALL retain successful first-window summaries and details, bounded to four scope entries and 8 MiB. Reopening SHALL begin at the first window. Exhausted valid entries SHALL reopen without source rereads; entries needing continuation SHALL paint immediately and rebuild live traversal with fresh cursors. Data changes, explicit refresh and service identity changes SHALL invalidate reuse.

#### Scenario: Complete Index is reopened
- **WHEN** the same library and scope reopen with unchanged revision and service identity and the cached first window exhausts the source
- **THEN** successful rows and loaded details are reused without a new native Index read.

#### Scenario: A closed page receives invalidation
- **WHEN** library or Reference data changes while the page is closed
- **THEN** reopening refreshes the invalidated Index.

#### Scenario: A later window was displayed before closing
- **WHEN** Index is reopened
- **THEN** it SHALL show the first window and SHALL NOT reuse a retained pagination cursor.

#### Scenario: The cached first window has continuation
- **WHEN** that window is reopened
- **THEN** it SHALL paint cached content immediately and establish fresh cursor boundaries before continuation.

### Requirement: Column repaint notifications SHALL preserve Index data

Custom-column notifications that only request repaint SHALL not invalidate Index data or invoke related-item echo reads. Real Zotero notifications SHALL retain their existing invalidation semantics. Related-item echo requests SHALL omit absent optional fields and receipts SHALL preserve the native consumed boolean.

#### Scenario: Custom column finishes loading
- **WHEN** it publishes a repaint-only item refresh
- **THEN** Index data stays valid and no echo RPC is dispatched

#### Scenario: Echo optional target is absent
- **WHEN** an ordinary item notification has no related-item target
- **THEN** its echo request remains valid JSON and reaches native dispatch
- **AND** a native false receipt remains false at the client boundary
