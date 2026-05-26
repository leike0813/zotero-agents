## ADDED Requirements

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
