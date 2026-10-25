## MODIFIED Requirements

### Requirement: Synthesis SHALL consume the complete artifact and derive projections

The Synthesis Application SHALL receive complete canonical Source Reference artifacts and Citation evidence. It SHALL derive labels, report markdown, snapshots, matching views, and readiness projections from that input; runtime adapters SHALL not recreate aliases or apply a second semantic filter.

#### Scenario: Live and cold Synthesis reads consume an artifact
- **WHEN** a live workflow apply or a cold Host scan submits a Source Reference artifact
- **THEN** both paths SHALL use the same closed artifact shape and opaque identity
- **AND** the Synthesis Application SHALL be the sole semantic projection owner.

#### Scenario: A derived display field changes
- **WHEN** a label or report projection is recomputed from a valid artifact
- **THEN** the source artifact and its evidence SHALL remain unchanged
- **AND** no alternate persisted DTO SHALL become a second source of truth.

#### Scenario: Bundle transfer reads notes with complete canonical facts
- **WHEN** a research bundle materializes a paper with multiple notes and images
- **THEN** it SHALL stage notes and their images in note order
- **AND** the transfer SHALL preserve canonical payload, provenance, visible HTML, image data, and tags without requiring derived public detail Markdown.

#### Scenario: Public detail remains bounded during bundle transfer
- **WHEN** a managed note is transferred successfully but its enriched public detail would exceed 1 MiB
- **THEN** the private transfer SHALL still return its canonical facts
- **AND** public `getNoteDetail` SHALL retain its existing 1 MiB bound.

#### Scenario: Research bundle staging fails
- **WHEN** a note or image stage fails during strict research bundle materialization
- **THEN** no later sibling stage SHALL start
- **AND** cleanup SHALL run before the original error is returned
- **AND** a cleanup failure SHALL be recorded as a separate diagnostic without replacing that error.

#### Scenario: Partial research bundle staging fails locally
- **WHEN** record_partial materialization encounters an unreadable note or image
- **THEN** later siblings SHALL continue and successful resources SHALL remain available
- **AND** the failed unit SHALL be diagnosed with its source identity.

### Requirement: Private transfer SHALL preserve intact auxiliary data with missing anchors

Private bundle transfer SHALL preserve unique, owned, semantically valid main and auxiliary payloads with absent or stale anchors, independently of HTML markers. It SHALL repair only the detached export copy and report recovery. Public semantic reads and writes SHALL retain validation of actual stored data. Invalid or ambiguous payloads SHALL never be selected as valid managed content.

#### Scenario: An intact auxiliary attachment has lost its anchor
- **WHEN** one valid owned main or auxiliary payload has an absent or stale anchor, including a note without a managed marker
- **THEN** export SHALL preserve its complete value and restore its association in the export copy
- **AND** import SHALL restore its readable association without export changing the source note.

#### Scenario: The auxiliary attachment is ambiguous or damaged
- **WHEN** an auxiliary payload has multiple candidates or malformed content during a partial export
- **THEN** transfer SHALL retain valid main data and readable body and images
- **AND** raw problem material SHALL be retained separately with a diagnostic instead of being selected as valid semantics.

## ADDED Requirements

### Requirement: Bundle export SHALL isolate local failures and preserve recovery material

Partial export SHALL isolate payload, image, note, attachment and paper failures, preserving healthy later units. Issues SHALL identify stage, source identities, payload type where known, error code and outcome. Recovery material and a report SHALL be covered by the bundle integrity inventory and excluded from normal managed import.

#### Scenario: A middle paper cannot be read
- **WHEN** a good, unreadable, good paper sequence is exported
- **THEN** both good papers SHALL retain their own metadata and content
- **AND** progress SHALL count every processed paper and the report SHALL identify the failed paper.

#### Scenario: A main payload is invalid
- **WHEN** main semantics cannot be validated
- **THEN** readable body and raw attachments SHALL enter recovery while sibling notes, images and paper attachments continue
- **AND** recovery SHALL not masquerade as a valid managed note during import.

#### Scenario: Export outcome reflects delivered material
- **WHEN** export finishes with only complete anchor recoveries
- **THEN** outcome SHALL be completed
- **AND** skipped or recovery-only material SHALL instead produce partial with issue count and report location.

#### Scenario: Every paper lacks basic data
- **WHEN** no requested paper can provide its basic metadata
- **THEN** export SHALL fail with its issue summary without creating an empty package or replacing the old target.

#### Scenario: Task-wide failure occurs
- **WHEN** cancellation, task timeout, host shutdown, destination write failure or global resource exhaustion occurs
- **THEN** export SHALL terminate, release its resources and preserve the old target.

#### Scenario: Strict caller does not opt into continuation
- **WHEN** failurePolicy is omitted or fail_fast
- **THEN** a local read failure SHALL retain the existing fail-fast behavior and cleanup contract.
