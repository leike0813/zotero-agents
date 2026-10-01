# Pi Runtime Audit

## Purpose

Provides bounded structural evidence and explicit diagnostic export for Pi product owners while preserving canonical ownership, execution responsiveness, privacy and existing Workspace presentation behavior.

## ADDED Requirements

### Requirement: One fact owner and one ordinary audit sink

Audit SHALL record each fact once at its owning execution seam after any corresponding canonical commit. Owner evidence SHALL use runtime-audit/audit.ndjson in its managed workspace; ownerless evidence SHALL use existing Runtime Log retention. Audit SHALL reuse the normalized log structure and SHALL NOT duplicate semantic bodies, failure core fields or business state. Failure evidence SHALL contain only its identity and location/correlation.

#### Scenario: Tool receipt propagation

- **WHEN** a tool receipt commits and propagates through owner and Workspace projections
- **THEN** exactly one corresponding structural audit record is written by its fact owner

### Requirement: Structural tier policy is centralized

Production SHALL admit owner terminal, observed failure, cancellation, capability denial/degradation, committed mutation receipt, integrity failure, repair terminal, security denial, audit gap and export terminal. Diagnostic Mode SHALL additionally admit structural execution/interaction/transport/policy/projection/export-start boundaries. Debug SHALL require the Debug Build and an independent source switch and SHALL add only structural detailed steps. Callers SHALL NOT choose tier/severity or introduce arbitrary text, Error, stack, unknown payload or extra attributes.

#### Scenario: Private content at any tier

- **WHEN** a caller supplies prose, transport bodies, credentials, absolute paths or URL queries
- **THEN** none of those values are stored or exported

### Requirement: Owner audit storage and admission are bounded

Each owner SHALL be limited to 64 MiB, 50,000 records and 64 KiB per record. Pending FIFO SHALL be limited to 1 MiB or 1,000 records; independent owners SHALL serialize independently. Overflow, oversized entries and write failures SHALL remain best-effort and produce bounded gap information without failing the owner. Reaching either store cap SHALL compact atomically to at most 48 MiB and 37,500 records: merge adjacent structural repeats, remove oldest debug then info, reduce old warning/error repeats retaining the latest representative, then remove oldest remainder. Compaction SHALL include a gap summary.

#### Scenario: Backpressure and subsequent recovery

- **WHEN** an owner exceeds pending capacity or its sink fails and later becomes writable
- **THEN** business execution continues and subsequent evidence reports the dropped or unavailable interval

#### Scenario: Storage cap

- **WHEN** either byte or entry cap is reached
- **THEN** retained evidence and its gap summary fit both 75-percent targets without changing canonical history

### Requirement: Audit follows owner lifecycle

Wait, terminal and archive SHALL best-effort flush. Archive SHALL retain audit, permanent Conversation deletion SHALL stop writes and remove it, and cleanup_pending SHALL retain data until cleanup succeeds. Audit SHALL NOT recreate deleted owners. Skill Run audit SHALL be eligible for its existing 30-day owner cleanup when the lifecycle owner implements that scheduling.

#### Scenario: Delete overlaps queued write

- **WHEN** a Conversation is permanently deleted while audit has pending or in-flight writes
- **THEN** those writes settle or are discarded before removal and no audit callback recreates its directory

### Requirement: User-selected diagnostic ZIP has precise scope

Owner export SHALL include exactly one owner's audit plus related global logs filtered by correlation and owner time window. Global export SHALL contain ownerless global facts/logs only and SHALL NOT scan owner workspaces. ZIP SHALL contain manifest.json, optional owner-audit.ndjson and runtime-diagnostics.json, saved only to the user's selected target. It SHALL be a controlled structural projection excluding prompts, assistant/Zotero/file/tool bodies, native errors, stderr, credentials, reusable secrets, absolute paths and URL queries. No automatic upload or all-owner export SHALL exist.

#### Scenario: Global export with several owners

- **WHEN** global diagnostics are exported
- **THEN** owner directories and owner-related logs are excluded

### Requirement: Export is consistent bounded and atomic

An active-owner export SHALL capture a fixed queue watermark and Runtime Log snapshot, then build from temporary snapshots without holding owner execution. Later records SHALL be excluded. Uncompressed content SHALL be at most 96 MiB, retaining manifest, structured failure and completeness facts first and trimming global logs before owner audit with the accepted retention order. Export SHALL NOT trim its sources. Temporary data SHALL be removed after success/failure. Failure SHALL return diagnostic_export_failed without changing owner state or publishing a partial ZIP.

#### Scenario: Active producer during export

- **WHEN** records arrive after the export barrier
- **THEN** they remain in normal audit storage but are absent from the exported snapshot

#### Scenario: Export budget or writer failure

- **WHEN** data exceeds the export budget or the atomic writer fails
- **THEN** the export is trimmed with completeness evidence or fails structurally while source files and owner state remain intact

### Requirement: Existing product surfaces own export actions

Selected Pi owner Details drawer SHALL expose scoped export; Backend Manager Built-in Agent SHALL expose global export. Host picker cancellation SHALL perform no export. The action SHALL retain its captured owner and SHALL NOT switch to a later selection. Transcript-only/loading/streaming updates SHALL preserve all unrelated managed-region DOM identities. Diagnostics SHALL remain passive without health UI or probes.

#### Scenario: Transcript update during owner export

- **WHEN** the selected owner's transcript updates while its Details drawer is open
- **THEN** Details and all other unrelated chrome regions preserve their DOM identity
