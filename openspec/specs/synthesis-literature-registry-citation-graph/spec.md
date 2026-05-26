# synthesis-literature-registry-citation-graph Specification

## Purpose
TBD - created by archiving change redesign-synthesis-incremental-update-triggers. Update Purpose after archive.
## Requirements
### Requirement: Literature registry maintenance uses dirty scopes

Synthesis Literature Registry SHALL maintain paper and reference canonical
records from scoped dirty events rather than routine full-library rebuilds.

#### Scenario: Paper artifact dirty event is processed

- **WHEN** a dirty event identifies one paper whose artifacts changed
- **THEN** the literature registry worker SHALL update canonical records for
  that paper and affected references
- **AND** unrelated papers SHALL NOT be rebuilt.

#### Scenario: Worker fails retryably

- **WHEN** an incremental registry worker fails with a retryable error
- **THEN** dirty scope state SHALL remain queued or failed_retryable
- **AND** latest usable projection data SHALL remain readable.

### Requirement: Literature registry full rebuild is explicit

Full literature registry rebuild SHALL remain an explicit repair or operator
command.

#### Scenario: Read detects missing projection

- **WHEN** a read path detects missing literature projection state
- **THEN** it SHALL return diagnostics and recommended commands
- **AND** it SHALL NOT start a full registry rebuild.

#### Scenario: Manual rebuild is requested

- **WHEN** a user or host command explicitly requests full registry rebuild
- **THEN** the rebuild SHALL run through observable job state and retry/backoff
  behavior.

### Requirement: Literature registry canonical records are paper-first

The Synthesis KG SHALL store user-facing literature registry records as paper-first canonical files keyed by `paper_ref`.

#### Scenario: Registry rebuild writes paper records

- **WHEN** registry inputs are rebuilt from Zotero metadata and generated artifact payloads
- **THEN** canonical paper files SHALL be written under `synthesis/citation-graph/papers/`
- **AND** each paper record SHALL preserve `paper_ref`, `library_id`, `item_key`, bibliographic metadata, artifact availability, diagnostics, and a stable content hash.

### Requirement: Reference data is canonicalized separately from graph projection

Reference instances, reference resolutions, citation contexts, works, work redirects, and cleanup proposals SHALL be canonical assets, while graph snapshots and metrics SHALL remain rebuildable projections.

#### Scenario: References are discovered from generated artifacts

- **WHEN** a paper has references and citation-analysis payloads
- **THEN** reference instance files SHALL be written under `reference-instances/`
- **AND** citation context files SHALL be written under `contexts/`
- **AND** malformed payloads SHALL produce sanitized diagnostics without aborting the full registry rebuild.

### Requirement: Citation graph projection is rebuildable from canonical records

The Synthesis service SHALL rebuild citation graph, metrics, and layout projections from canonical literature registry records.

#### Scenario: Projection state is deleted

- **WHEN** citation graph projection files under `synthesis/state/` are deleted
- **THEN** the service SHALL rebuild equivalent graph, metrics, and layout DTOs from canonical records.

### Requirement: Rebuilds use Foundation transaction and projection registry

Canonical literature registry writes SHALL use Foundation transactions and mark affected projections stale.

#### Scenario: Registry transaction commits

- **WHEN** canonical literature records are committed
- **THEN** exactly one `canonical-store-changed` event SHALL be produced
- **AND** `literature-registry-index` and `citation-graph-index` SHALL be marked stale.

### Requirement: Cleanup queue supports minimal actions

Cleanup proposals SHALL support approve, reject, and skip actions.

#### Scenario: Cleanup action is applied

- **WHEN** a cleanup proposal action is applied
- **THEN** the proposal status SHALL update deterministically
- **AND** diagnostics SHALL be sanitized
- **AND** graph projection state SHALL be marked stale when the action affects graph records.

### Requirement: Diagnostics do not leak sensitive paths or tokens

Literature registry diagnostics SHALL avoid secrets and sensitive absolute paths.

#### Scenario: Payload ingestion fails

- **WHEN** a payload parse or transaction validation fails
- **THEN** diagnostics SHALL include asset scope, relative path, hash or error code
- **AND** diagnostics SHALL NOT include tokens or unsanitized absolute paths.

### Requirement: Literature registry projections are freshness tracked

Synthesis Literature Registry SHALL maintain persistent freshness/job state for canonical-backed registry and citation projections.

#### Scenario: Source inputs become stale

- **WHEN** registry or citation graph source inputs change
- **THEN** literature job state SHALL become `stale`
- **AND** a background rebuild MAY be queued without blocking snapshot reads.

#### Scenario: Projection is missing

- **WHEN** the local JSON projection cache is missing
- **THEN** literature job state SHALL become `missing`
- **AND** latest usable projection diagnostics SHALL be exposed.

### Requirement: Literature registry rebuild runs in a single background worker

Synthesis Literature Registry SHALL run canonical/projection rebuilds through a single service-level worker when queued.

#### Scenario: Multiple rebuild notifications are coalesced

- **WHEN** multiple rebuild requests occur within the debounce window
- **THEN** only one background rebuild SHALL run.

#### Scenario: Rebuild succeeds

- **WHEN** the background rebuild completes successfully
- **THEN** job state SHALL become `ready`
- **AND** literature and citation projection source manifest hashes SHALL match canonical manifest hash.

#### Scenario: Rebuild fails retryably

- **WHEN** rebuild fails with a retryable error
- **THEN** job state SHALL become `failed_retryable`
- **AND** retry attempt and next retry time SHALL be recorded
- **AND** latest usable projection files SHALL remain readable.

#### Scenario: Manual retry is requested

- **WHEN** manual retry is requested
- **THEN** the worker SHALL clear scheduled retry metadata and attempt rebuild immediately.

### Requirement: Literature projection backend is declared

Synthesis Literature Registry SHALL declare its current projection backend as JSON/DTO.

#### Scenario: Projection is written

- **WHEN** registry and citation projections are rebuilt
- **THEN** each projection SHALL include backend metadata with `kind` equal to `json-dto`
- **AND** `sqlite`, `fts`, and `bm25` SHALL be false.

### Requirement: Workbench snapshot reads are side-effect free

Synthesis Workbench snapshot reads SHALL NOT mutate Literature Registry or
Citation Graph job, canonical, or projection state.

#### Scenario: Projection is stale or missing during snapshot read

- **WHEN** the Workbench reads a snapshot and literature or citation projection
  state is stale or missing
- **THEN** the snapshot SHALL report bounded freshness diagnostics
- **AND** it SHALL NOT enqueue a rebuild job
- **AND** it SHALL NOT write job state, projection files, receipts, events, or
  canonical assets.

### Requirement: Workbench reads citation data from lightweight projections

Synthesis Workbench SHALL use projection files or latest usable legacy
projection files for Literature/Citation rendering.

#### Scenario: Canonical citation directories exist

- **WHEN** Workbench snapshot data is read
- **THEN** the service SHALL NOT scan `citation-graph/*` canonical directories
  solely to render the Workbench snapshot.

#### Scenario: JSON projection exists

- **WHEN** `state/citation-graph-index.json` exists
- **THEN** Workbench graph data SHALL be read from that projection.

### Requirement: Literature and citation graph actions are asynchronous in UI

Workbench Literature Registry and Citation Graph controls SHALL treat rebuild,
retry, cleanup, and layout work as asynchronous operations.

#### Scenario: Registry rebuild is started

- **WHEN** the user starts a Literature Registry rebuild
- **THEN** the Workbench SHALL disable duplicate rebuild actions while the job is
  queued, running, or locally pending
- **AND** retry SHALL remain available only for retryable failure states.

#### Scenario: Citation graph layout recompute is started

- **WHEN** the user starts layout recompute for a preset
- **THEN** the Workbench SHALL disable recompute for the same preset until the
  operation completes or fails
- **AND** read-only graph interactions SHALL remain available.

### Requirement: Literature registry canonical records are persisted safely

Literature registry canonical records SHALL be persisted through Synthesis
canonical transactions using managed path policy.

#### Scenario: Long reference-derived work id exists

- **WHEN** a work, reference instance, reference resolution, citation context,
  or cleanup proposal id is derived from a long raw reference or title
- **THEN** the canonical asset filename SHALL be short and stable
- **AND** registry rebuild SHALL not fail solely because the semantic id is
  longer than a platform filename budget.

